import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { EmployeeForm } from './employee-form';

const API = 'http://localhost:8080/api/employees';

describe('EmployeeForm', () => {
  let fixture: ComponentFixture<EmployeeForm>;
  let component: EmployeeForm;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  const JOB_TITLES = ['Account Manager', 'Senior Software Engineer', 'Software Engineer'];

  function create(
    id: string | null,
    departments: string[] | 'fail' = ['Engineering', 'Sales'],
    jobTitles: string[] | 'fail' = JOB_TITLES,
  ) {
    TestBed.configureTestingModule({
      imports: [EmployeeForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(EmployeeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const request = http.expectOne(`${API}/departments`);
    if (departments === 'fail') {
      request.flush('boom', { status: 500, statusText: 'Server Error' });
    } else {
      request.flush(departments);
    }
    const titlesRequest = http.expectOne(`${API}/job-titles`);
    if (jobTitles === 'fail') {
      titlesRequest.flush('boom', { status: 500, statusText: 'Server Error' });
    } else {
      titlesRequest.flush(jobTitles);
    }
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  describe('adding an employee', () => {
    beforeEach(() => create(null));

    it('starts empty with the add title', () => {
      expect(element().querySelector('h1')?.textContent).toContain('Add employee');
      expect(component.form.getRawValue().name).toBe('');
    });

    it('does not submit and shows messages while required fields are empty', () => {
      submit();

      http.expectNone(API);
      expect(element().textContent).toContain('Name is required');
      expect(element().textContent).toContain('Email is required');
      expect(element().textContent).toContain('Department is required');
      expect(element().textContent).toContain('Country is required');
      expect(element().textContent).toContain('Base salary is required');
    });

    it('rejects an invalid email', () => {
      fill({ email: 'not-an-email' });
      submit();

      http.expectNone(API);
      expect(element().textContent).toContain('Enter a valid email address');
    });

    it('rejects a salary that is zero, negative or has more than two decimals', () => {
      for (const salary of [0, -5, 10.123]) {
        fill({ baseSalary: salary });
        expect(component.form.controls.baseSalary.valid).toBe(false);
      }
      fill({ baseSalary: 10.5 });
      expect(component.form.controls.baseSalary.valid).toBe(true);
    });

    it('rejects names longer than the backend allows', () => {
      fill({ name: 'x'.repeat(101) });

      expect(component.form.controls.name.hasError('maxlength')).toBe(true);
    });

    it('posts the form and returns to the list on success', () => {
      fill({});
      submit();

      const request = http.expectOne(API);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual(validValues());
      request.flush({ ...validValues(), id: 9, currency: 'INR' });

      expect(navigate).toHaveBeenCalledWith(['/employees']);
    });

    it('disables the save button while the request is running', () => {
      fill({});
      submit();

      expect(saveButton().disabled).toBe(true);
      http.expectOne(API).flush({ ...validValues(), id: 9, currency: 'INR' });
    });

    it('shows field messages from a 400 response and stays on the page', () => {
      fill({});
      submit();
      http.expectOne(API).flush(
        { status: 400, message: 'Validation failed', errors: [{ field: 'email', message: 'must be a well-formed email address' }] },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(component.form.controls.email.hasError('server')).toBe(true);
      expect(element().textContent).toContain('must be a well-formed email address');
      expect(element().textContent).toContain('Please correct the highlighted fields');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('shows the duplicate email message from a 409 response on the email field', () => {
      fill({});
      submit();
      http.expectOne(API).flush(
        { status: 409, message: 'Email already in use: asha@acme.com', errors: [] },
        { status: 409, statusText: 'Conflict' },
      );
      fixture.detectChanges();

      expect(component.form.controls.email.hasError('server')).toBe(true);
      expect(element().querySelector('mat-error')?.textContent).toContain('Email already in use');
      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Email already in use');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('lets the user fix the email and save again after a 409', () => {
      fill({});
      submit();
      http.expectOne(API).flush({ status: 409, message: 'Email already in use: asha@acme.com', errors: [] }, { status: 409, statusText: 'Conflict' });

      fill({ email: 'asha.rao@acme.com' });
      submit();

      const retry = http.expectOne(API);
      expect(retry.request.body.email).toBe('asha.rao@acme.com');
      retry.flush({ ...validValues(), id: 9, currency: 'INR' });
    });

    it('shows a generic message for server failures', () => {
      fill({});
      submit();
      http.expectOne(API).flush('boom', { status: 500, statusText: 'Server Error' });
      fixture.detectChanges();

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('Could not save employee');
      expect(saveButton().disabled).toBe(false);
    });
  });

  describe('department dropdown', () => {
    it('is a select, not a free-text input', () => {
      create(null);

      expect(element().querySelector('mat-select[formControlName="department"]')).not.toBeNull();
      expect(element().querySelector('input[formControlName="department"]')).toBeNull();
    });

    it('lists the departments loaded from the backend', () => {
      create(null);

      openDepartmentSelect();

      expect(options()).toEqual(['Engineering', 'Sales']);
    });

    it('fills the control when an option is chosen', () => {
      create(null);
      openDepartmentSelect();

      (document.querySelectorAll('mat-option')[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(component.form.controls.department.value).toBe('Sales');
    });

    it('requires a department to be chosen', () => {
      create(null);
      fill({ department: '' });
      submit();

      http.expectNone(API);
      expect(component.form.controls.department.hasError('required')).toBe(true);
      expect(element().textContent).toContain('Department is required');
    });

    it('sends the chosen department', () => {
      create(null);
      fill({ department: 'Sales' });
      submit();

      const request = http.expectOne(API);
      expect(request.request.body.department).toBe('Sales');
      request.flush({ ...validValues(), department: 'Sales', id: 9, currency: 'INR' });
    });

    it('explains the problem when the departments cannot be loaded', () => {
      create(null, 'fail');

      expect(element().textContent).toContain('Departments could not be loaded');
      openDepartmentSelect();
      expect(options()).toEqual([]);
    });
  });

  describe('text fields and salary', () => {
    it('treats whitespace-only text as missing', () => {
      create(null);
      fill({ name: '   ', jobTitle: '\t' });
      submit();

      http.expectNone(API);
      expect(component.form.controls.name.hasError('required')).toBe(true);
      expect(component.form.controls.jobTitle.hasError('required')).toBe(true);
    });

    it('trims surrounding spaces before sending', () => {
      create(null);
      fill({ name: '  Asha Rao ', jobTitle: ' Software Engineer ' });
      submit();

      const request = http.expectOne(API);
      expect(request.request.body).toEqual(validValues());
      request.flush({ ...validValues(), id: 9, currency: 'INR' });
    });

    it('accepts the largest salary the database can hold and rejects one digit more', () => {
      create(null);

      fill({ baseSalary: 9999999999999.99 });
      expect(component.form.controls.baseSalary.valid).toBe(true);
      fill({ baseSalary: 10000000000000 });
      expect(component.form.controls.baseSalary.hasError('pattern')).toBe(true);
    });

    it('explains a server field error that has no matching input in the banner', () => {
      create(null);
      fill({});
      submit();
      http.expectOne(API).flush(
        { status: 400, message: 'Validation failed', errors: [{ field: 'nickname', message: 'is not allowed' }] },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(element().querySelector('[role="alert"]')?.textContent).toContain('nickname: is not allowed');
    });

    it('puts each of several server field errors on its own control', () => {
      create(null);
      fill({});
      submit();
      http.expectOne(API).flush(
        {
          status: 400,
          message: 'Validation failed',
          errors: [
            { field: 'name', message: 'must not be blank' },
            { field: 'baseSalary', message: 'must be greater than 0' },
          ],
        },
        { status: 400, statusText: 'Bad Request' },
      );
      fixture.detectChanges();

      expect(component.form.controls.name.errors).toEqual({ server: 'must not be blank' });
      expect(component.form.controls.baseSalary.errors).toEqual({ server: 'must be greater than 0' });
    });
  });

  describe('editing an employee', () => {
    beforeEach(() => create('5'));

    function loadEmployee(): TestRequest {
      const request = http.expectOne(`${API}/5`);
      request.flush({ ...validValues(), id: 5, currency: 'INR' });
      fixture.detectChanges();
      return request;
    }

    it('loads the employee and pre-fills the form', () => {
      expect(element().querySelector('h1')?.textContent).toContain('Edit employee');
      loadEmployee();

      expect(component.form.getRawValue()).toEqual(validValues());
      expect(element().querySelector('mat-select[formControlName="department"]')?.textContent).toContain('Engineering');
    });

    it('puts the changes and returns to the list', () => {
      loadEmployee();
      fill({ baseSalary: 60000 });
      submit();

      const request = http.expectOne(`${API}/5`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ ...validValues(), baseSalary: 60000 });
      request.flush({ ...validValues(), id: 5, currency: 'INR', baseSalary: 60000 });

      expect(navigate).toHaveBeenCalledWith(['/employees']);
    });

    it('lets the employee keep their own email', () => {
      loadEmployee();
      submit();

      const request = http.expectOne(`${API}/5`);
      expect(request.request.body.email).toBe('asha@acme.com');
      request.flush({ ...validValues(), id: 5, currency: 'INR' });
    });
  });

  describe('editing an employee that does not exist', () => {
    beforeEach(() => create('99'));

    it('says so instead of showing an empty form', () => {
      http.expectOne(`${API}/99`).flush(
        { status: 404, message: 'Employee not found: 99', errors: [] },
        { status: 404, statusText: 'Not Found' },
      );
      fixture.detectChanges();

      expect(element().textContent).toContain('Employee not found');
      expect(element().querySelector('form')).toBeNull();
    });
  });

  describe('job title autocomplete', () => {
    it('is an autocomplete text input, not a select', () => {
      create(null);

      expect(jobTitleInput().getAttribute('aria-autocomplete')).toBe('list');
    });

    it('suggests every job title from the backend while the field is empty', () => {
      create(null);

      type('');

      expect(options()).toEqual(JOB_TITLES);
    });

    it('narrows the suggestions as the user types, ignoring case', () => {
      create(null);

      type('ENGINEER');

      expect(options()).toEqual(['Senior Software Engineer', 'Software Engineer']);
    });

    it('matches anywhere in the title and ignores surrounding spaces', () => {
      create(null);

      type('  manag ');

      expect(options()).toEqual(['Account Manager']);
    });

    it('shows no suggestions when nothing matches', () => {
      create(null);

      type('zzz');

      expect(options()).toEqual([]);
    });

    it('fills the control when a suggestion is chosen', () => {
      create(null);
      type('soft');

      (document.querySelectorAll('mat-option')[1] as HTMLElement).click();
      fixture.detectChanges();

      expect(component.form.controls.jobTitle.value).toBe('Software Engineer');
    });

    it('still accepts a new title that is not in the list', () => {
      create(null);
      fill({ jobTitle: 'Chief Happiness Officer' });
      submit();

      const request = http.expectOne(API);
      expect(request.request.body.jobTitle).toBe('Chief Happiness Officer');
      request.flush({ ...validValues(), jobTitle: 'Chief Happiness Officer', id: 9, currency: 'INR' });
    });

    it('keeps working as a plain text field when the titles cannot be loaded', () => {
      create(null, ['Engineering'], 'fail');

      type('soft');

      expect(options()).toEqual([]);
      expect(element().querySelector('[role="alert"]')).toBeNull();
      fill({ jobTitle: 'Software Engineer' });
      expect(component.form.controls.jobTitle.valid).toBe(true);
    });
  });

  describe('layout', () => {
    beforeEach(() => create(null));

    it('groups the fields into two cards', () => {
      const cards = Array.from(element().querySelectorAll('mat-card'));

      expect(cards.map((card) => card.querySelector('h2')?.textContent?.trim())).toEqual([
        'Personal information',
        'Role and compensation',
      ]);
    });

    it('puts name, email and country in the first card', () => {
      expect(fieldsIn(0)).toEqual(['name', 'email', 'country']);
    });

    it('puts department, job title and salary in the second card', () => {
      expect(fieldsIn(1)).toEqual(['department', 'jobTitle', 'baseSalary']);
    });

    it('keeps one form around both cards, with the actions after them', () => {
      const form = element().querySelector('form') as HTMLFormElement;

      expect(form.querySelectorAll('mat-card').length).toBe(2);
      expect(form.querySelector('.actions button[type="submit"]')).not.toBeNull();
    });
  });

  function fieldsIn(card: number): string[] {
    return Array.from(element().querySelectorAll('mat-card')[card].querySelectorAll('[formControlName]')).map(
      (control) => control.getAttribute('formControlName') ?? '',
    );
  }

  function jobTitleInput(): HTMLInputElement {
    return element().querySelector('input[formControlName="jobTitle"]') as HTMLInputElement;
  }

  // Focusing opens the suggestion panel; the input event is what typing produces.
  function type(text: string) {
    const input = jobTitleInput();
    input.focus();
    input.dispatchEvent(new Event('focusin'));
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function openDepartmentSelect() {
    (element().querySelector('mat-select[formControlName="department"] .mat-mdc-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
  }

  // The option list is rendered in an overlay outside the component.
  function options(): string[] {
    return Array.from(document.querySelectorAll('mat-option')).map((option) => option.textContent?.trim() ?? '');
  }

  function validValues() {
    return {
      name: 'Asha Rao',
      email: 'asha@acme.com',
      department: 'Engineering',
      jobTitle: 'Software Engineer',
      country: 'INDIA' as const,
      baseSalary: 55000,
    };
  }

  // Sets every field to a valid value, then applies the overrides.
  function fill(overrides: Record<string, unknown>) {
    component.form.patchValue({ ...validValues(), ...overrides });
    fixture.detectChanges();
  }

  function submit() {
    saveButton().click();
    fixture.detectChanges();
  }

  function saveButton(): HTMLButtonElement {
    return element().querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }
});
