import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Employee, PageResponse } from '../../core/models';
import { EmployeeList } from './employee-list';

const API = 'http://localhost:8080/api/employees';

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let component: EmployeeList;
  let http: HttpTestingController;
  // Stands in for the confirmation dialog; each test decides what the user answered.
  const dialog = { open: vi.fn() };

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), { provide: MatDialog, useValue: dialog }],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(EmployeeList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  it('loads the first page and the departments on start', () => {
    const request = listRequest();

    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    expect(request.request.params.has('search')).toBe(false);
    flushDepartments(['Engineering', 'Sales']);
    request.flush(page([employee()], 1));
    fixture.detectChanges();

    expect(component.departments()).toEqual(['Engineering', 'Sales']);
  });

  it('renders one row per employee with every column', () => {
    flushDepartments([]);
    listRequest().flush(page([employee()], 1));
    fixture.detectChanges();

    // The first cell holds the selection checkbox.
    const cells = Array.from(element().querySelectorAll('tbody tr td'))
      .map((cell) => cell.textContent?.trim())
      .slice(1, 8);
    expect(cells).toEqual(['Asha Rao', 'asha@acme.com', 'Software Engineer', 'Engineering', 'India', '55,000.00', 'INR']);
  });

  it('shows the total in the paginator', () => {
    flushDepartments([]);
    listRequest().flush(page([employee()], 10000));
    fixture.detectChanges();

    const paginator = fixture.debugElement.query(By.directive(MatPaginator)).componentInstance as MatPaginator;
    expect(paginator.length).toBe(10000);
  });

  describe('total count', () => {
    it('is not shown before the first page has loaded', () => {
      expect(totalText()).toBe('');

      settle();
      expect(totalText()).toBe('0 employees');
    });

    it('shows how many employees exist, with thousands separators', () => {
      flushDepartments([]);
      listRequest().flush(page([employee()], 10000));
      fixture.detectChanges();

      expect(totalText()).toBe('10,000 employees');
    });

    it('sits in its own row below the filters, not in the toolbar', () => {
      showEmployees(2);

      const filters = element().querySelector('.filters') as HTMLElement;
      const summary = element().querySelector('.summary') as HTMLElement;
      expect(summary.querySelector('.total')).not.toBeNull();
      expect(element().querySelector('.toolbar .total')).toBeNull();
      expect(filters.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('highlights the number', () => {
      flushDepartments([]);
      listRequest().flush(page([employee()], 10000));
      fixture.detectChanges();

      expect(element().querySelector('.total strong')?.textContent).toBe('10,000');
    });

    it('shows zero when the list is empty', () => {
      settle();

      expect(totalText()).toBe('0 employees');
    });

    it('uses the singular for one employee', () => {
      flushDepartments([]);
      listRequest().flush(page([employee()], 1));
      fixture.detectChanges();
      expect(totalText()).toBe('1 employee');

      component.country.setValue('UK');
      fixture.detectChanges();
      listRequest().flush(page([employee()], 1));
      fixture.detectChanges();
      expect(totalText()).toBe('1 employee matches the filters');
    });

    it('says the number matches the filters once a filter is applied', () => {
      settle();

      component.country.setValue('INDIA');
      fixture.detectChanges();
      listRequest().flush(page([employee()], 3314));
      fixture.detectChanges();

      expect(totalText()).toBe('3,314 employees match the filters');
    });

    it('counts matches for a search and for a salary range too', () => {
      settle();
      component.country.setValue('INDIA');
      fixture.detectChanges();
      listRequest().flush(page([], 0));
      fixture.detectChanges();

      component.minSalary.setValue(100);
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      listRequest().flush(page([employee()], 7));
      fixture.detectChanges();

      expect(totalText()).toBe('7 employees match the filters');
    });

    it('goes back to the plain total when the filters are cleared', () => {
      settle();
      component.country.setValue('INDIA');
      fixture.detectChanges();
      listRequest().flush(page([], 0));
      fixture.detectChanges();

      component.country.setValue('');
      fixture.detectChanges();
      listRequest().flush(page([employee()], 10000));
      fixture.detectChanges();

      expect(totalText()).toBe('10,000 employees');
    });

    it('is hidden when the list could not be loaded', () => {
      flushDepartments([]);
      listRequest().flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(totalText()).toBe('');
    });
  });

  it('shows the empty and error states inside the grid container too', () => {
    flushDepartments([]);
    listRequest().flush(page([], 0));
    fixture.detectChanges();

    expect(element().querySelector('.grid .state')?.textContent).toContain('No employees found');
  });

  it('shows an empty state when nothing matches', () => {
    flushDepartments([]);
    listRequest().flush(page([], 0));
    fixture.detectChanges();

    expect(element().textContent).toContain('No employees found');
    expect(element().querySelector('table')).toBeNull();
  });

  it('shows an error with a retry that requests the page again', () => {
    flushDepartments([]);
    listRequest().flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element().textContent).toContain('Could not load employees');

    (element().querySelector('button.retry') as HTMLButtonElement).click();
    fixture.detectChanges();
    listRequest().flush(page([employee()], 1));
    fixture.detectChanges();

    expect(element().textContent).not.toContain('Could not load employees');
    expect(element().querySelectorAll('tbody tr').length).toBe(1);
  });

  it('waits 300 ms after typing before searching, and resets to the first page', () => {
    settle();
    const input = searchInput();
    input.value = 'asha';
    input.dispatchEvent(new Event('input'));

    vi.advanceTimersByTime(299);
    fixture.detectChanges();
    http.expectNone((r) => r.url === API);

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    const request = listRequest();
    expect(request.request.params.get('search')).toBe('asha');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([], 0));
  });

  it('sends only the last term when typing continues', () => {
    settle();
    const input = searchInput();
    for (const term of ['a', 'as', 'asha']) {
      input.value = term;
      input.dispatchEvent(new Event('input'));
      vi.advanceTimersByTime(100);
    }
    vi.advanceTimersByTime(300);
    fixture.detectChanges();

    const request = listRequest();
    expect(request.request.params.get('search')).toBe('asha');
    request.flush(page([], 0));
  });

  it('filters by country immediately', () => {
    settle();

    component.country.setValue('INDIA');
    fixture.detectChanges();

    const request = listRequest();
    expect(request.request.params.get('country')).toBe('INDIA');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([], 0));
  });

  it('filters by department immediately', () => {
    settle();

    component.department.setValue('Sales');
    fixture.detectChanges();

    const request = listRequest();
    expect(request.request.params.get('department')).toBe('Sales');
    request.flush(page([], 0));
  });

  it('requests the chosen page and size from the paginator', () => {
    settle();

    paginator().page.emit({ pageIndex: 3, pageSize: 50, length: 10000 });
    fixture.detectChanges();

    const request = listRequest();
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('size')).toBe('50');
    request.flush(page([], 10000));
  });

  it('goes back to the first page when a filter changes', () => {
    settle();
    paginator().page.emit({ pageIndex: 3, pageSize: 20, length: 10000 });
    fixture.detectChanges();
    listRequest().flush(page([], 10000));

    component.country.setValue('UK');
    fixture.detectChanges();

    const request = listRequest();
    expect(request.request.params.get('country')).toBe('UK');
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([], 0));
  });

  it('links to the add form and to each employee edit form', () => {
    flushDepartments([]);
    listRequest().flush(page([employee()], 1));
    fixture.detectChanges();

    expect(element().querySelector('a.add')?.getAttribute('href')).toBe('/employees/new');
    expect(element().querySelector('tbody a.edit')?.getAttribute('href')).toBe('/employees/1/edit');
  });

  it('asks for confirmation naming the employee before deleting', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    showOneEmployee();

    deleteButton().click();

    const config = dialog.open.mock.lastCall![1];
    expect(config.data.message).toContain('Asha Rao');
  });

  it('deletes after confirmation and reloads the list', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    showOneEmployee();

    deleteButton().click();

    const remove = http.expectOne(`${API}/1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    listRequest().flush(page([], 0));
  });

  it('does nothing when the deletion is cancelled', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(false) });
    showOneEmployee();

    deleteButton().click();
    fixture.detectChanges();

    http.expectNone(`${API}/1`);
    http.expectNone((r) => r.url === API);
  });

  it('shows an error when the deletion fails', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    showOneEmployee();

    deleteButton().click();
    http.expectOne(`${API}/1`).flush('boom', { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(element().querySelector('[role="alert"]')?.textContent).toContain('Could not delete');
    // The row is still listed because nothing was removed.
    expect(element().querySelectorAll('tbody tr').length).toBe(1);
  });

  it('steps back a page when the last row of a later page is deleted', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
    settle();
    paginator().page.emit({ pageIndex: 2, pageSize: 20, length: 41 });
    fixture.detectChanges();
    listRequest().flush(page([employee()], 41));
    fixture.detectChanges();

    deleteButton().click();
    http.expectOne(`${API}/1`).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    const reload = listRequest();
    expect(reload.request.params.get('page')).toBe('1');
    reload.flush(page([], 40));
  });

  describe('row selection', () => {
    beforeEach(() => showEmployees(3));

    it('has a checkbox on every row and one in the header', () => {
      expect(rowBoxes().length).toBe(3);
      expect(headerBox()).not.toBeNull();
    });

    it('shows no action bar while nothing is selected', () => {
      expect(element().querySelector('.bulk-bar')).toBeNull();
    });

    it('shows the count and a bulk delete button once a row is ticked', () => {
      rowBoxes()[0].click();
      fixture.detectChanges();

      expect(element().querySelector('.bulk-bar')?.textContent).toContain('1 selected');
      expect(bulkDeleteButton().textContent).toContain('Bulk delete');
    });

    it('counts several ticked rows and drops the bar when they are unticked', () => {
      rowBoxes()[0].click();
      rowBoxes()[2].click();
      fixture.detectChanges();
      expect(element().querySelector('.bulk-bar')?.textContent).toContain('2 selected');

      rowBoxes()[0].click();
      rowBoxes()[2].click();
      fixture.detectChanges();
      expect(element().querySelector('.bulk-bar')).toBeNull();
    });

    it('selects every row on the page from the header and clears them again', () => {
      headerBox().click();
      fixture.detectChanges();
      expect(rowBoxes().every((box) => box.checked)).toBe(true);
      expect(element().querySelector('.bulk-bar')?.textContent).toContain('3 selected');

      headerBox().click();
      fixture.detectChanges();
      expect(rowBoxes().some((box) => box.checked)).toBe(false);
      expect(element().querySelector('.bulk-bar')).toBeNull();
    });

    it('marks the header as indeterminate when only some rows are ticked', () => {
      rowBoxes()[1].click();
      fixture.detectChanges();

      expect(headerBox().indeterminate).toBe(true);
      expect(headerBox().checked).toBe(false);
    });

    it('highlights the rows that are ticked and only those', () => {
      rowBoxes()[0].click();
      rowBoxes()[2].click();
      fixture.detectChanges();

      const rows = Array.from(element().querySelectorAll('tbody tr'));
      expect(rows.map((row) => row.classList.contains('selected'))).toEqual([true, false, true]);

      rowBoxes()[0].click();
      fixture.detectChanges();
      expect(element().querySelectorAll('tbody tr.selected')).toHaveLength(1);
    });

    it('highlights every row when all are selected from the header', () => {
      headerBox().click();
      fixture.detectChanges();

      expect(element().querySelectorAll('tbody tr.selected')).toHaveLength(3);
    });

    it('keeps the table and its paginator together in one grid container', () => {
      const grid = element().querySelector('.grid') as HTMLElement;

      expect(grid.querySelector('table')).not.toBeNull();
      expect(grid.querySelector('mat-paginator')).not.toBeNull();
    });

    it('labels each checkbox with the employee it selects', () => {
      expect(rowBoxes()[1].getAttribute('aria-label')).toBe('Select Person 2');
    });

    it('forgets the selection when the page changes', () => {
      rowBoxes()[0].click();
      fixture.detectChanges();

      paginator().page.emit({ pageIndex: 1, pageSize: 20, length: 40 });
      fixture.detectChanges();
      listRequest().flush(page(people(3), 40));
      fixture.detectChanges();

      expect(element().querySelector('.bulk-bar')).toBeNull();
      expect(rowBoxes().some((box) => box.checked)).toBe(false);
    });

    it('forgets the selection when a filter changes', () => {
      rowBoxes()[0].click();
      fixture.detectChanges();

      component.country.setValue('UK');
      fixture.detectChanges();
      listRequest().flush(page(people(3), 3));
      fixture.detectChanges();

      expect(element().querySelector('.bulk-bar')).toBeNull();
    });
  });

  describe('bulk delete', () => {
    beforeEach(() => showEmployees(3));

    it('asks for confirmation that states how many employees will go', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) });
      selectRows(0, 1);

      bulkDeleteButton().click();

      const config = dialog.open.mock.lastCall![1];
      expect(config.data.message).toContain('2 selected employees');
    });

    it('does nothing when the confirmation is cancelled', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) });
      selectRows(0, 1);

      bulkDeleteButton().click();
      fixture.detectChanges();

      http.expectNone((r) => r.method === 'DELETE');
      expect(element().querySelector('.bulk-bar')?.textContent).toContain('2 selected');
    });

    it('sends one request with the selected ids and reloads the list', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });
      selectRows(0, 2);

      bulkDeleteButton().click();

      const remove = http.expectOne(API);
      expect(remove.request.method).toBe('DELETE');
      expect(remove.request.body).toEqual({ ids: [1, 3] });
      remove.flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();
      listRequest().flush(page(people(1), 1));
      fixture.detectChanges();

      expect(element().querySelector('.bulk-bar')).toBeNull();
    });

    it('shows an error and keeps the selection when the request fails', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });
      selectRows(0, 1);

      bulkDeleteButton().click();
      http.expectOne(API).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Could not delete the selected employees');
      expect(element().querySelector('.bulk-bar')?.textContent).toContain('2 selected');
    });

    it('explains and refreshes the list when some employees no longer exist', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });
      selectRows(0, 1);

      bulkDeleteButton().click();
      http.expectOne(API).flush(
        { status: 404, message: 'Employees not found: [2]', errors: [] },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('no longer exist');
      listRequest().flush(page(people(2), 2));
    });

    it('steps back a page when every row of a later page is deleted', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) });
      paginator().page.emit({ pageIndex: 2, pageSize: 20, length: 43 });
      fixture.detectChanges();
      listRequest().flush(page(people(3), 43));
      fixture.detectChanges();
      headerBox().click();
      fixture.detectChanges();

      bulkDeleteButton().click();
      http.expectOne(API).flush(null, { status: 204, statusText: 'No Content' });
      fixture.detectChanges();

      const reload = listRequest();
      expect(reload.request.params.get('page')).toBe('1');
      reload.flush(page([], 40));
    });
  });

  describe('salary range filter', () => {
    beforeEach(() => settle());

    it('keeps the inputs disabled until a country is chosen', () => {
      expect(salaryInput('min').disabled).toBe(true);
      expect(salaryInput('max').disabled).toBe(true);

      component.country.setValue('INDIA');
      fixture.detectChanges();
      listRequest().flush(page([], 0));
      fixture.detectChanges();

      expect(salaryInput('min').disabled).toBe(false);
      expect(salaryInput('max').disabled).toBe(false);
    });

    it('sends the minimum with the country after 300 ms and returns to the first page', () => {
      chooseCountry('INDIA');

      typeSalary('min', '40000');
      vi.advanceTimersByTime(299);
      http.expectNone((r) => r.url === API);
      vi.advanceTimersByTime(1);
      fixture.detectChanges();

      const request = listRequest();
      expect(request.request.params.get('country')).toBe('INDIA');
      expect(request.request.params.get('minSalary')).toBe('40000');
      expect(request.request.params.has('maxSalary')).toBe(false);
      expect(request.request.params.get('page')).toBe('0');
      request.flush(page([], 0));
    });

    it('sends both bounds together', () => {
      chooseCountry('UK');

      typeSalary('min', '40000');
      typeSalary('max', '60000');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      const request = listRequest();
      expect(request.request.params.get('minSalary')).toBe('40000');
      expect(request.request.params.get('maxSalary')).toBe('60000');
      request.flush(page([], 0));
    });

    it('drops the salary range when the country is cleared', () => {
      chooseCountry('INDIA');
      typeSalary('min', '40000');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      listRequest().flush(page([], 0));

      component.country.setValue('');
      fixture.detectChanges();

      const request = listRequest();
      expect(request.request.params.has('country')).toBe(false);
      expect(request.request.params.has('minSalary')).toBe(false);
      expect(salaryInput('min').value).toBe('');
      expect(salaryInput('min').disabled).toBe(true);
      request.flush(page([], 0));
    });

    it('does not search and shows a message when the minimum is above the maximum', () => {
      chooseCountry('INDIA');

      typeSalary('min', '60000');
      typeSalary('max', '40000');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      http.expectNone((r) => r.url === API);
      expect(element().textContent).toContain('Minimum must not exceed maximum');
    });

    it('searches again once the range is fixed', () => {
      chooseCountry('INDIA');
      typeSalary('min', '60000');
      typeSalary('max', '40000');
      vi.advanceTimersByTime(300);

      typeSalary('max', '80000');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      const request = listRequest();
      expect(request.request.params.get('minSalary')).toBe('60000');
      expect(request.request.params.get('maxSalary')).toBe('80000');
      request.flush(page([], 0));
    });

    it('rejects a negative salary without searching', () => {
      chooseCountry('INDIA');

      typeSalary('min', '-5');
      vi.advanceTimersByTime(300);
      fixture.detectChanges();

      http.expectNone((r) => r.url === API);
      expect(element().textContent).toContain('Must be 0 or more');
    });
  });

  function showEmployees(count: number) {
    flushDepartments([]);
    listRequest().flush(page(people(count), count));
    fixture.detectChanges();
  }

  function people(count: number): Employee[] {
    return Array.from({ length: count }, (_, i) => ({
      ...employee(),
      id: i + 1,
      name: `Person ${i + 1}`,
      email: `person${i + 1}@acme.com`,
    }));
  }

  function rowBoxes(): HTMLInputElement[] {
    return Array.from(element().querySelectorAll('tbody input[type="checkbox"]'));
  }

  function headerBox(): HTMLInputElement {
    return element().querySelector('thead input[type="checkbox"]') as HTMLInputElement;
  }

  function selectRows(...indexes: number[]) {
    indexes.forEach((index) => rowBoxes()[index].click());
    fixture.detectChanges();
  }

  function bulkDeleteButton(): HTMLButtonElement {
    return element().querySelector('.bulk-bar button.bulk-delete') as HTMLButtonElement;
  }

  function salaryInput(which: 'min' | 'max'): HTMLInputElement {
    return element().querySelector(`input.${which}-salary`) as HTMLInputElement;
  }

  function typeSalary(which: 'min' | 'max', value: string) {
    const input = salaryInput(which);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  // The salary inputs only work with a country, so these tests start by choosing one and answering its request.
  function chooseCountry(country: 'INDIA' | 'UK') {
    component.country.setValue(country);
    fixture.detectChanges();
    listRequest().flush(page([], 0));
    fixture.detectChanges();
  }

  function totalText(): string {
    return element().querySelector('.total')?.textContent?.trim() ?? '';
  }

  function showOneEmployee() {
    flushDepartments([]);
    listRequest().flush(page([employee()], 1));
    fixture.detectChanges();
  }

  function deleteButton(): HTMLButtonElement {
    return element().querySelector('tbody button.delete') as HTMLButtonElement;
  }

  // Answers the two requests made on start so a test can focus on what happens next.
  function settle() {
    flushDepartments([]);
    listRequest().flush(page([], 0));
    fixture.detectChanges();
  }

  function listRequest(): TestRequest {
    return http.expectOne((r) => r.url === API);
  }

  function flushDepartments(departments: string[]) {
    http.expectOne(`${API}/departments`).flush(departments);
  }

  function searchInput(): HTMLInputElement {
    return element().querySelector('input[type="search"], input[matInput]') as HTMLInputElement;
  }

  function paginator(): MatPaginator {
    return fixture.debugElement.query(By.directive(MatPaginator)).componentInstance;
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function employee(): Employee {
    return {
      id: 1,
      name: 'Asha Rao',
      email: 'asha@acme.com',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      country: 'INDIA',
      currency: 'INR',
      baseSalary: 55000,
    };
  }

  function page(content: Employee[], totalElements: number): PageResponse<Employee> {
    return { content, page: 0, size: 20, totalElements, totalPages: Math.ceil(totalElements / 20) };
  }
});
