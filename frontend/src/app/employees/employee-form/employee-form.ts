import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EmployeeService } from '../../core/employee.service';
import { ApiError, COUNTRY_LABELS, Country, EmployeeRequest } from '../../core/models';

type FieldName = 'name' | 'email' | 'department' | 'jobTitle' | 'country' | 'baseSalary';

const FIELD_LABELS: Record<FieldName, string> = {
  name: 'Name',
  email: 'Email',
  department: 'Department',
  jobTitle: 'Job title',
  country: 'Country',
  baseSalary: 'Base salary',
};

// Validators.required accepts "   ", but the backend's @NotBlank does not; same error key so messages stay the same.
function requiredText(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

// Serves both /employees/new and /employees/:id/edit.
@Component({
  selector: 'app-employee-form',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
  ],
  templateUrl: './employee-form.html',
  styleUrl: './employee-form.scss',
})
export class EmployeeForm {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);

  protected readonly countries = Object.keys(COUNTRY_LABELS) as Country[];
  protected readonly countryLabels = COUNTRY_LABELS;

  // Same rules as the backend's EmployeeRequest, so most mistakes are caught before a request is sent.
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [requiredText, Validators.maxLength(100)] }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(255)],
    }),
    // Chosen from the existing departments, so no free-text rules are needed.
    department: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    jobTitle: new FormControl('', { nonNullable: true, validators: [requiredText, Validators.maxLength(100)] }),
    country: new FormControl<Country | ''>('', { nonNullable: true, validators: [Validators.required] }),
    // Positive, at most 13 integer digits and 2 decimals: what DECIMAL(15,2) can hold.
    baseSalary: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0.01),
      Validators.pattern(/^\d{1,13}(\.\d{1,2})?$/),
    ]),
  });

  protected readonly departments = signal<string[]>([]);
  protected readonly departmentsFailed = signal(false);

  // null when adding a new employee.
  protected readonly employeeId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  protected readonly loading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.employeeService.departments().subscribe({
      next: (departments) => this.departments.set(departments),
      // The field only accepts listed departments, so a failure must be visible instead of silently blocking Save.
      error: () => this.departmentsFailed.set(true),
    });

    if (this.employeeId !== null) {
      this.loading.set(true);
      this.employeeService.get(this.employeeId).subscribe({
        next: (employee) => {
          this.form.patchValue(employee);
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.loadError.set(error.status === 404 ? 'Employee not found.' : 'Could not load the employee.');
        },
      });
    }
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Valid means country and baseSalary are filled in.
    const raw = this.form.getRawValue();
    const request = {
      ...raw,
      name: raw.name.trim(),
      jobTitle: raw.jobTitle.trim(),
    } as EmployeeRequest;
    this.saving.set(true);
    this.formError.set(null);
    const call =
      this.employeeId === null
        ? this.employeeService.create(request)
        : this.employeeService.update(this.employeeId, request);
    call.subscribe({
      next: () => this.router.navigate(['/employees']),
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.showServerError(error);
      },
    });
  }

  protected errorMessage(field: FieldName): string {
    const errors = this.form.controls[field].errors;
    if (!errors) {
      return '';
    }
    if (errors['server']) {
      return errors['server'];
    }
    if (errors['required']) {
      return `${FIELD_LABELS[field]} is required`;
    }
    if (errors['email']) {
      return 'Enter a valid email address';
    }
    if (errors['maxlength']) {
      return `Use at most ${errors['maxlength'].requiredLength} characters`;
    }
    if (errors['min']) {
      return 'Must be greater than 0';
    }
    return 'Use at most 2 decimal places';
  }

  private showServerError(error: HttpErrorResponse): void {
    const body = error.error as Partial<ApiError> | null;
    if (error.status === 400 && body?.errors?.length) {
      // A message for a field this form has no input for would otherwise be lost, so it goes in the banner.
      const unmatched = body.errors
        .filter((fieldError) => !this.markServerError(fieldError.field, fieldError.message))
        .map((fieldError) => `${fieldError.field}: ${fieldError.message}`);
      this.formError.set(unmatched.length ? unmatched.join('. ') : 'Please correct the highlighted fields.');
    } else if (error.status === 409 && body?.message) {
      // A conflict is almost always the unique email, so it is shown on that field as well as above the form.
      this.markServerError('email', body.message);
      this.formError.set(body.message);
    } else {
      this.formError.set('Could not save employee. Please try again.');
    }
  }

  // The error clears by itself as soon as the user edits the field again.
  private markServerError(field: string, message: string): boolean {
    const control = this.form.get(field);
    control?.setErrors({ server: message });
    control?.markAsTouched();
    return control !== null;
  }
}
