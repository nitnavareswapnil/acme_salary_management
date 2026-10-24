import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatPaginator } from '@angular/material/paginator';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Employee, PageResponse } from '../../core/models';
import { EmployeeList } from './employee-list';

const API = 'http://localhost:8080/api/employees';

describe('EmployeeList', () => {
  let fixture: ComponentFixture<EmployeeList>;
  let component: EmployeeList;
  let http: HttpTestingController;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [EmployeeList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

    const cells = Array.from(element().querySelectorAll('tbody tr td')).map((cell) => cell.textContent?.trim());
    expect(cells).toEqual(['Asha Rao', 'asha@acme.com', 'Software Engineer', 'Engineering', 'India', '55,000.00', 'INR']);
  });

  it('shows the total in the paginator', () => {
    flushDepartments([]);
    listRequest().flush(page([employee()], 10000));
    fixture.detectChanges();

    const paginator = fixture.debugElement.query(By.directive(MatPaginator)).componentInstance as MatPaginator;
    expect(paginator.length).toBe(10000);
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
