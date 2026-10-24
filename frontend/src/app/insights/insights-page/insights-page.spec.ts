import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CountrySalaryStats, JobTitleAverage } from '../../core/models';
import { InsightsPage } from './insights-page';

const API = 'http://localhost:8080/api/insights/countries';

describe('InsightsPage', () => {
  let fixture: ComponentFixture<InsightsPage>;
  let component: InsightsPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsightsPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InsightsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

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
      http.expectNone((r) => r.url.includes('/job-titles'));
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

  function statsRequest(): TestRequest {
    return http.expectOne(API);
  }

  function titlesRequest(country: string): TestRequest {
    return http.expectOne(`${API}/${country}/job-titles`);
  }

  function statsSection(): HTMLElement {
    return element().querySelector('section.stats') as HTMLElement;
  }

  function titlesSection(): HTMLElement {
    return element().querySelector('section.titles') as HTMLElement;
  }

  function openCountrySelect() {
    (titlesSection().querySelector('mat-select .mat-mdc-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
  }

  // The option list is rendered in an overlay outside the component.
  function options(): string[] {
    return Array.from(document.querySelectorAll('mat-option')).map((option) => option.textContent?.trim() ?? '');
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function stats(country: CountrySalaryStats['country'], currency: string): CountrySalaryStats {
    return { country, currency, minSalary: 612000, maxSalary: 2484000, avgSalary: 1288747.05, employeeCount: 3309 };
  }

  function title(jobTitle: string, avgSalary: number, employeeCount: number): JobTitleAverage {
    return { jobTitle, avgSalary, employeeCount };
  }
});
