import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChartConfiguration } from 'chart.js';
import { Country, CountrySalaryStats, DepartmentAverage, JobTitleAverage } from '../../core/models';
import { CHART_FACTORY } from '../../shared/chart/chart-canvas';
import { COUNTRY_COLORS } from '../../shared/chart/chart-config';
import { InsightsPage } from './insights-page';

const API = 'http://localhost:8080/api/insights/countries';
const TITLE_OPTIONS_URL = 'http://localhost:8080/api/employees/job-titles';

describe('InsightsPage', () => {
  let fixture: ComponentFixture<InsightsPage>;
  let component: InsightsPage;
  let http: HttpTestingController;
  // Stands in for Chart.js (which needs a real canvas): records every configuration the page asks to draw.
  let charts: ChartConfiguration[];

  beforeEach(async () => {
    charts = [];
    await TestBed.configureTestingModule({
      imports: [InsightsPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: CHART_FACTORY,
          useValue: (_canvas: HTMLCanvasElement, config: ChartConfiguration) => {
            charts.push(config);
            return { destroy: () => undefined };
          },
        },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InsightsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Choosing a country also requests its department averages, and the page asks for the job title options when
  // it opens. Those have their own describes; in the older tests they are simply answered here so verify() only
  // reports requests nobody expected.
  afterEach(() => {
    http
      .match((request) => request.url.endsWith('/departments') || request.url === TITLE_OPTIONS_URL)
      .filter((request) => !request.cancelled)
      .forEach((request) => request.flush([]));
    http.verify();
  });

  describe('salary by country', () => {
    it('shows a loading bar until the statistics arrive', () => {
      expect(statsSection().querySelector('mat-progress-bar')).not.toBeNull();

      statsRequest().flush([stats('INDIA', 'INR')]);
      fixture.detectChanges();

      expect(statsSection().querySelector('mat-progress-bar')).toBeNull();
    });

    it('renders one row per country with currency, headcount, min, average and max', () => {
      statsRequest().flush([stats('INDIA', 'INR'), stats('UK', 'GBP')]);
      fixture.detectChanges();

      const rows = Array.from(statsSection().querySelectorAll('tbody tr')).map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
      );
      expect(rows[0]).toEqual(['India', 'INR', '3,309', '612,000.00', '1,288,747.05', '2,484,000.00']);
      expect(rows[1][0]).toBe('United Kingdom');
      expect(rows).toHaveLength(2);
    });

    it('shows an empty state when there is no salary data', () => {
      statsRequest().flush([]);
      fixture.detectChanges();

      expect(statsSection().textContent).toContain('No salary data yet');
      expect(statsSection().querySelector('table')).toBeNull();
    });

    it('shows an error with a retry that loads the statistics again', () => {
      statsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(statsSection().textContent).toContain('Could not load salary statistics');

      (statsSection().querySelector('button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();
      statsRequest().flush([stats('US', 'USD')]);
      fixture.detectChanges();

      expect(statsSection().textContent).not.toContain('Could not load salary statistics');
      expect(statsSection().querySelectorAll('tbody tr')).toHaveLength(1);
    });
  });

  describe('when the statistics failed', () => {
    it('still shows the averages for a chosen country, just without the currency', () => {
      statsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      component.country.setValue('INDIA');
      fixture.detectChanges();

      titlesRequest('INDIA').flush([title('Accountant', 85000, 4)]);
      fixture.detectChanges();

      expect(titlesSection().querySelectorAll('tbody tr')).toHaveLength(1);
      expect(titlesSection().querySelector('th.amount')?.textContent).not.toContain('(');
    });
  });

  describe('job titles in a country', () => {
    beforeEach(() => {
      statsRequest().flush([stats('INDIA', 'INR'), stats('UK', 'GBP')]);
      fixture.detectChanges();
    });

    it('asks the user to choose a country and requests nothing yet', () => {
      expect(titlesSection().textContent).toContain('Choose a country');
      http.expectNone((r) => r.url.startsWith(API) && r.url.endsWith('/job-titles'));
    });

    it('offers every supported country', () => {
      openCountrySelect();

      expect(options()).toEqual(['United States', 'India', 'United Kingdom']);
    });

    it('loads and renders the averages for the chosen country', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      expect(titlesSection().querySelector('mat-progress-bar')).not.toBeNull();

      titlesRequest('INDIA').flush([title('Engineering Manager', 2100000.5, 58), title('Support Agent', 700000, 120)]);
      fixture.detectChanges();

      const rows = Array.from(titlesSection().querySelectorAll('tbody tr')).map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
      );
      expect(rows).toEqual([
        ['Engineering Manager', '2,100,000.50', '58'],
        ['Support Agent', '700,000.00', '120'],
      ]);
      expect(titlesSection().querySelector('th.amount')?.textContent).toContain('INR');
      expect(titlesSection().querySelector('mat-progress-bar')).toBeNull();
    });

    it('switches to another country and ignores the answer for the previous one', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      const india = titlesRequest('INDIA');

      component.country.setValue('UK');
      fixture.detectChanges();
      titlesRequest('UK').flush([title('Accountant', 45000, 30)]);
      fixture.detectChanges();

      expect(india.cancelled).toBe(true);
      expect(titlesSection().textContent).toContain('Accountant');
      expect(titlesSection().querySelector('th.amount')?.textContent).toContain('GBP');
    });

    it('shows an empty state for a country without employees', () => {
      component.country.setValue('US');
      fixture.detectChanges();

      titlesRequest('US').flush([]);
      fixture.detectChanges();

      expect(titlesSection().textContent).toContain('No employees in United States');
      expect(titlesSection().querySelector('table')).toBeNull();
    });

    it('shows an error with a retry for the chosen country', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(titlesSection().textContent).toContain('Could not load job title averages');

      (titlesSection().querySelector('button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();
      titlesRequest('INDIA').flush([title('Accountant', 85000, 4)]);
      fixture.detectChanges();

      expect(titlesSection().textContent).not.toContain('Could not load job title averages');
      expect(titlesSection().querySelectorAll('tbody tr')).toHaveLength(1);
    });
  });

  describe('collapsible sections', () => {
    beforeEach(() => {
      statsRequest().flush([stats('INDIA', 'INR'), stats('UK', 'GBP')]);
      fixture.detectChanges();
    });

    const sections = () => [statsSection, titlesSection, departmentsSection, comparisonSection];

    it('starts with every section expanded', () => {
      for (const section of sections()) {
        expect(headerOf(section()).getAttribute('aria-expanded')).toBe('true');
        expect(section().querySelector('mat-expansion-panel')?.classList).toContain('mat-expanded');
      }
    });

    it('gives each header an arrow and keyboard access as a button', () => {
      for (const section of sections()) {
        expect(headerOf(section()).getAttribute('role')).toBe('button');
        expect(headerOf(section()).getAttribute('tabindex')).toBe('0');
        expect(section().querySelector('.mat-expansion-indicator')).not.toBeNull();
      }
    });

    it('collapses a section when its header is clicked and expands it again on the next click', () => {
      headerOf(statsSection()).click();
      fixture.detectChanges();
      expect(headerOf(statsSection()).getAttribute('aria-expanded')).toBe('false');
      expect(statsSection().querySelector('mat-expansion-panel')?.classList).not.toContain('mat-expanded');

      headerOf(statsSection()).click();
      fixture.detectChanges();
      expect(headerOf(statsSection()).getAttribute('aria-expanded')).toBe('true');
    });

    it('collapses sections independently of each other', () => {
      headerOf(titlesSection()).click();
      fixture.detectChanges();

      expect(headerOf(titlesSection()).getAttribute('aria-expanded')).toBe('false');
      expect(headerOf(statsSection()).getAttribute('aria-expanded')).toBe('true');
      expect(headerOf(departmentsSection()).getAttribute('aria-expanded')).toBe('true');
    });

    it('keeps the data and asks for nothing again when a section is collapsed and reopened', () => {
      headerOf(statsSection()).click();
      fixture.detectChanges();
      headerOf(statsSection()).click();
      fixture.detectChanges();

      expect(statsSection().querySelectorAll('tbody tr')).toHaveLength(2);
      http.expectNone(API);
    });

    it('still loads a country chosen while a section is collapsed', () => {
      headerOf(titlesSection()).click();
      fixture.detectChanges();

      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush([title('Accountant', 85000, 4)]);
      fixture.detectChanges();
      headerOf(titlesSection()).click();
      fixture.detectChanges();

      expect(titlesSection().querySelectorAll('tbody tr')).toHaveLength(1);
    });

    it('keeps the country selector outside the sections so collapsing one never hides it', () => {
      const select = element().querySelector('mat-select') as HTMLElement;

      expect(select).not.toBeNull();
      expect(select.closest('mat-expansion-panel')).toBeNull();
    });
  });

  describe('job title comparison across countries', () => {
    const OPTIONS = ['Accountant', 'Software Engineer', 'Support Agent'];

    beforeEach(() => {
      statsRequest().flush([stats('US', 'USD', 3274), stats('INDIA', 'INR'), stats('UK', 'GBP', 3377)]);
      http.expectOne(TITLE_OPTIONS_URL).flush(OPTIONS);
      fixture.detectChanges();
    });

    // Answers the three per-country requests a comparison makes. Requests cancelled by a newer choice stay in
    // the controller's list, so only the live one per country is answered.
    function answer(rows: Partial<Record<Country, JobTitleAverage[]>>) {
      for (const country of ['US', 'INDIA', 'UK'] as const) {
        const live = http.match(`${API}/${country}/job-titles`).filter((request) => !request.cancelled);
        expect(live).toHaveLength(1);
        live[0].flush(rows[country] ?? []);
      }
      fixture.detectChanges();
    }

    function cards(): HTMLElement[] {
      return Array.from(comparisonSection().querySelectorAll('.comparison-card'));
    }

    const text = (element: Element | null) => element?.textContent?.replace(/\s+/g, ' ').trim();

    it('offers the job titles known to the backend', () => {
      (comparisonSection().querySelector('mat-select .mat-mdc-select-trigger') as HTMLElement).click();
      fixture.detectChanges();

      expect(options()).toEqual(OPTIONS);
    });

    it('asks the user to choose a job title and requests nothing yet', () => {
      expect(comparisonSection().textContent).toContain('Choose a job title to compare');
      http.expectNone((r) => r.url.startsWith(API));
    });

    it('requests every country once a title is chosen and shows a loading bar meanwhile', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();

      expect(comparisonSection().querySelector('mat-progress-bar')).not.toBeNull();
      answer({});
      expect(comparisonSection().querySelector('mat-progress-bar')).toBeNull();
    });

    it('shows one card per country, side by side, each in its own currency', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      answer({
        US: [title('Accountant', 76000, 40)],
        INDIA: [title('Accountant', 1022734.78, 138)],
        UK: [title('Accountant', 45000.5, 30)],
      });

      expect(cards().map((card) => text(card.querySelector('.country')))).toEqual([
        'United States',
        'India',
        'United Kingdom',
      ]);
      expect(cards().map((card) => text(card.querySelector('.currency')))).toEqual(['USD', 'INR', 'GBP']);
      expect(cards().map((card) => text(card.querySelector('.amount')))).toEqual([
        'USD 76,000.00',
        'INR 1,022,734.78',
        'GBP 45,000.50',
      ]);
      expect(cards().map((card) => text(card.querySelector('.count')))).toEqual([
        '40 employees',
        '138 employees',
        '30 employees',
      ]);
    });

    it('says plainly that the amounts are not converted', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      answer({ US: [title('Accountant', 76000, 40)] });

      expect(comparisonSection().querySelector('.note')?.textContent).toContain('not converted');
    });

    it('keeps the cards in country order rather than ranking by amount', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      answer({
        US: [title('Accountant', 1, 1)],
        INDIA: [title('Accountant', 999999999, 1)],
        UK: [title('Accountant', 5, 1)],
      });

      expect(cards().map((card) => text(card.querySelector('.country')))).toEqual([
        'United States',
        'India',
        'United Kingdom',
      ]);
    });

    it('marks a country with nobody in that role instead of hiding it', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      answer({ US: [title('Accountant', 76000, 40)], INDIA: [title('Recruiter', 500000, 9)] });

      expect(cards()).toHaveLength(3);
      expect(text(cards()[1])).toContain('India');
      expect(text(cards()[1])).toContain('No employees in this role');
      expect(cards()[1].querySelector('.amount')).toBeNull();
    });

    it('switches to another title and ignores the answers still pending for the previous one', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      const first = titlesRequest('US');

      component.jobTitle.setValue('Support Agent');
      fixture.detectChanges();
      answer({ US: [title('Support Agent', 40000, 5)] });

      expect(first.cancelled).toBe(true);
      expect(text(cards()[0].querySelector('.amount'))).toBe('USD 40,000.00');
    });

    it('shows an error with a retry that asks every country again', () => {
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      titlesRequest('US').flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(comparisonSection().textContent).toContain('Could not compare this job title');
      expect(cards()).toHaveLength(0);

      (comparisonSection().querySelector('button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();
      answer({ US: [title('Accountant', 76000, 40)] });

      expect(comparisonSection().textContent).not.toContain('Could not compare');
      expect(cards()).toHaveLength(3);
    });
  });

  describe('job title comparison when its inputs fail', () => {
    it('explains that the job titles could not be loaded', () => {
      statsRequest().flush([stats('US', 'USD')]);
      http.expectOne(TITLE_OPTIONS_URL).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(comparisonSection().textContent).toContain('Job titles could not be loaded');
    });

    it('still shows the amounts, just without currency codes, when the statistics failed', () => {
      statsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      http.expectOne(TITLE_OPTIONS_URL).flush(['Accountant']);
      component.jobTitle.setValue('Accountant');
      fixture.detectChanges();
      for (const country of ['US', 'INDIA', 'UK']) {
        titlesRequest(country).flush(country === 'US' ? [title('Accountant', 76000, 40)] : []);
      }
      fixture.detectChanges();

      const amount = comparisonSection().querySelector('.comparison-card .amount');
      expect(amount?.textContent?.trim()).toBe('76,000.00');
      expect(comparisonSection().querySelector('.comparison-card .currency')?.textContent?.trim()).toBe('');
    });
  });

  describe('headcount chart', () => {
    it('draws a donut of employees per country in each country\'s own colour', () => {
      statsRequest().flush([stats('INDIA', 'INR', 3309), stats('UK', 'GBP', 3377)]);
      fixture.detectChanges();

      const donut = charts.find((chart) => chart.type === 'doughnut')!;
      expect(donut.data.labels).toEqual(['India', 'United Kingdom']);
      expect(donut.data.datasets[0].data).toEqual([3309, 3377]);
      expect(donut.data.datasets[0].backgroundColor).toEqual([COUNTRY_COLORS.INDIA, COUNTRY_COLORS.UK]);
    });

    it('lists every country with its count and share beside the chart', () => {
      statsRequest().flush([stats('INDIA', 'INR', 3309), stats('UK', 'GBP', 3377)]);
      fixture.detectChanges();

      const items = Array.from(statsSection().querySelectorAll('.legend li')).map((li) =>
        li.textContent?.replace(/\s+/g, ' ').trim(),
      );
      expect(items).toEqual(['India 3,309 (49%)', 'United Kingdom 3,377 (51%)']);
    });

    it('shows the total headcount in the middle of the donut', () => {
      statsRequest().flush([stats('INDIA', 'INR', 3309), stats('UK', 'GBP', 3377)]);
      fixture.detectChanges();

      expect(statsSection().querySelector('.donut-total')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        '6,686 employees',
      );
    });

    it('keeps the statistics table next to the chart as its text alternative', () => {
      statsRequest().flush([stats('INDIA', 'INR')]);
      fixture.detectChanges();

      expect(statsSection().querySelector('app-chart-canvas')).not.toBeNull();
      expect(statsSection().querySelector('table')).not.toBeNull();
      expect(statsSection().querySelector('canvas')?.getAttribute('aria-label')).toContain('table');
    });

    it('draws nothing when there is no data', () => {
      statsRequest().flush([]);
      fixture.detectChanges();
      expect(charts).toHaveLength(0);
      expect(statsSection().querySelector('app-chart-canvas')).toBeNull();

    });

    it('draws nothing when the statistics failed', () => {
      statsRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(charts).toHaveLength(0);
      expect(statsSection().querySelector('app-chart-canvas')).toBeNull();
    });
  });

  describe('top-earning roles chart', () => {
    beforeEach(() => {
      statsRequest().flush([stats('INDIA', 'INR'), stats('UK', 'GBP')]);
      fixture.detectChanges();
      charts.length = 0;
    });

    const seven = () =>
      ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, i) => title(`Role ${name}`, 700000 - i * 1000, 10 + i));

    it('plots the five best-paid roles, highest first', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush(seven());
      fixture.detectChanges();

      const bars = charts.find((chart) => chart.type === 'bar')!;
      expect(bars.data.labels).toEqual(['Role A', 'Role B', 'Role C', 'Role D', 'Role E']);
      expect(bars.data.datasets[0].data).toEqual([700000, 699000, 698000, 697000, 696000]);
    });

    it('plots every role when there are fewer than five', () => {
      component.country.setValue('UK');
      fixture.detectChanges();
      titlesRequest('UK').flush([title('Accountant', 45000, 30), title('Recruiter', 40000, 12)]);
      fixture.detectChanges();

      expect(charts.find((chart) => chart.type === 'bar')!.data.labels).toEqual(['Accountant', 'Recruiter']);
    });

    it('names the currency in the chart heading', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush(seven());
      fixture.detectChanges();

      expect(titlesSection().querySelector('.chart-title')?.textContent).toContain('Top-earning roles');
      expect(titlesSection().querySelector('.chart-title')?.textContent).toContain('INR');
    });

    it('keeps the full table, not just the five plotted roles', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush(seven());
      fixture.detectChanges();

      expect(titlesSection().querySelectorAll('tbody tr')).toHaveLength(7);
      expect(titlesSection().querySelector('canvas')?.getAttribute('aria-label')).toContain('table');
    });

    it('draws nothing before a country is chosen, while loading, when empty or after an error', () => {
      expect(titlesSection().querySelector('app-chart-canvas')).toBeNull();

      component.country.setValue('US');
      fixture.detectChanges();
      expect(titlesSection().querySelector('app-chart-canvas')).toBeNull();

      titlesRequest('US').flush([]);
      fixture.detectChanges();
      expect(titlesSection().querySelector('app-chart-canvas')).toBeNull();

      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();
      expect(titlesSection().querySelector('app-chart-canvas')).toBeNull();
      expect(charts).toHaveLength(0);
    });
  });

  describe('average salary by department', () => {
    beforeEach(() => {
      statsRequest().flush([stats('INDIA', 'INR'), stats('UK', 'GBP')]);
      fixture.detectChanges();
      charts.length = 0;
    });

    // The job title card requests its own data for the same selection; it is answered empty here.
    function chooseCountry(country: 'US' | 'INDIA' | 'UK') {
      component.country.setValue(country);
      fixture.detectChanges();
      titlesRequest(country).flush([]);
      fixture.detectChanges();
    }

    it('asks the user to choose a country and requests nothing yet', () => {
      expect(departmentsSection().textContent).toContain('Choose a country to see average salary by department');
      http.expectNone((r) => r.url.endsWith('/departments'));
    });

    it('loads the chosen country with a loading bar, then renders table and chart', () => {
      chooseCountry('INDIA');
      expect(departmentsSection().querySelector('mat-progress-bar')).not.toBeNull();

      departmentsRequest('INDIA').flush([department('Sales', 800000.5, 12), department('Support', 500000, 30)]);
      fixture.detectChanges();

      const rows = Array.from(departmentsSection().querySelectorAll('tbody tr')).map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim()),
      );
      expect(rows).toEqual([
        ['Sales', '800,000.50', '12'],
        ['Support', '500,000.00', '30'],
      ]);
      expect(departmentsSection().querySelector('th.amount')?.textContent).toContain('INR');
      expect(departmentsSection().querySelector('mat-progress-bar')).toBeNull();

      const bars = charts.find((chart) => chart.type === 'bar')!;
      expect(bars.data.labels).toEqual(['Sales', 'Support']);
      expect(bars.data.datasets[0].data).toEqual([800000.5, 500000]);
    });

    it('names the currency in the chart heading and labels the chart for screen readers', () => {
      chooseCountry('UK');
      departmentsRequest('UK').flush([department('Finance', 61000, 40)]);
      fixture.detectChanges();

      expect(departmentsSection().querySelector('.chart-title')?.textContent).toContain('GBP');
      expect(departmentsSection().querySelector('canvas')?.getAttribute('aria-label')).toContain('table');
    });

    it('switches country and ignores the answer for the previous one', () => {
      chooseCountry('INDIA');
      const india = departmentsRequest('INDIA');

      chooseCountry('UK');
      departmentsRequest('UK').flush([department('Finance', 61000, 40)]);
      fixture.detectChanges();

      expect(india.cancelled).toBe(true);
      expect(departmentsSection().textContent).toContain('Finance');
      expect(departmentsSection().querySelector('th.amount')?.textContent).toContain('GBP');
    });

    it('shows an empty state for a country without employees', () => {
      chooseCountry('US');

      departmentsRequest('US').flush([]);
      fixture.detectChanges();

      expect(departmentsSection().textContent).toContain('No employees in United States');
      expect(departmentsSection().querySelector('table')).toBeNull();
      expect(departmentsSection().querySelector('app-chart-canvas')).toBeNull();
    });

    it('shows an error with a retry that does not disturb the job title card', () => {
      component.country.setValue('INDIA');
      fixture.detectChanges();
      titlesRequest('INDIA').flush([title('Accountant', 85000, 4)]);
      departmentsRequest('INDIA').flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(departmentsSection().textContent).toContain('Could not load department averages');
      expect(titlesSection().querySelectorAll('tbody tr')).toHaveLength(1);

      (departmentsSection().querySelector('button.retry') as HTMLButtonElement).click();
      fixture.detectChanges();
      departmentsRequest('INDIA').flush([department('Finance', 61000, 40)]);
      fixture.detectChanges();

      expect(departmentsSection().textContent).not.toContain('Could not load department averages');
      expect(departmentsSection().querySelectorAll('tbody tr')).toHaveLength(1);
    });
  });

  function statsRequest(): TestRequest {
    return http.expectOne(API);
  }

  function titlesRequest(country: string): TestRequest {
    return http.expectOne(`${API}/${country}/job-titles`);
  }

  function comparisonSection(): HTMLElement {
    return element().querySelector('section.comparison') as HTMLElement;
  }

  function departmentsRequest(country: string): TestRequest {
    return http.expectOne(`${API}/${country}/departments`);
  }

  function departmentsSection(): HTMLElement {
    return element().querySelector('section.departments') as HTMLElement;
  }

  function headerOf(section: HTMLElement): HTMLElement {
    return section.querySelector('mat-expansion-panel-header') as HTMLElement;
  }

  function statsSection(): HTMLElement {
    return element().querySelector('section.stats') as HTMLElement;
  }

  function titlesSection(): HTMLElement {
    return element().querySelector('section.titles') as HTMLElement;
  }

  function openCountrySelect() {
    (element().querySelector('mat-select .mat-mdc-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
  }

  // The option list is rendered in an overlay outside the component.
  function options(): string[] {
    return Array.from(document.querySelectorAll('mat-option')).map((option) => option.textContent?.trim() ?? '');
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function stats(country: CountrySalaryStats['country'], currency: string, employeeCount = 3309): CountrySalaryStats {
    return { country, currency, minSalary: 612000, maxSalary: 2484000, avgSalary: 1288747.05, employeeCount };
  }

  function department(name: string, avgSalary: number, employeeCount: number): DepartmentAverage {
    return { department: name, avgSalary, employeeCount };
  }

  function title(jobTitle: string, avgSalary: number, employeeCount: number): JobTitleAverage {
    return { jobTitle, avgSalary, employeeCount };
  }
});
