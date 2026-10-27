import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, filter, map, merge, of, switchMap, tap } from 'rxjs';
import { EmployeeService } from '../../core/employee.service';
import { COUNTRY_LABELS, Country, Employee, EmployeeQuery } from '../../core/models';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-employee-list',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './employee-list.html',
  styleUrl: './employee-list.scss',
})
export class EmployeeList {
  private readonly employeeService = inject(EmployeeService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = ['select', 'name', 'email', 'jobTitle', 'department', 'country', 'baseSalary', 'currency', 'actions'];
  protected readonly countries = Object.keys(COUNTRY_LABELS) as Country[];
  protected readonly countryLabels = COUNTRY_LABELS;
  // Matches the largest page the backend allows.
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  readonly search = new FormControl('', { nonNullable: true });
  readonly country = new FormControl<Country | ''>('', { nonNullable: true });
  readonly department = new FormControl('', { nonNullable: true });
  // Disabled until a country is chosen: the backend rejects a salary range without one.
  readonly minSalary = new FormControl<number | null>({ value: null, disabled: true }, [Validators.min(0)]);
  readonly maxSalary = new FormControl<number | null>({ value: null, disabled: true }, [
    Validators.min(0),
    (control: AbstractControl): ValidationErrors | null => this.belowMinimum(control),
  ]);
  protected readonly countryChosen = toSignal(this.country.valueChanges.pipe(map(Boolean)), { initialValue: false });

  readonly departments = signal<string[]>([]);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(false);
  // The count stays hidden until a page has arrived, so it never flashes a misleading 0.
  private readonly loaded = signal(false);
  protected readonly failed = signal(false);
  protected readonly actionError = signal<string | null>(null);
  // Ids of the ticked rows on the current page; cleared whenever the list is requested again.
  protected readonly selection = signal<ReadonlySet<number>>(new Set());
  protected readonly selectedCount = computed(() => this.selection().size);
  protected readonly allSelected = computed(
    () => this.employees().length > 0 && this.employees().every((employee) => this.selection().has(employee.id)),
  );
  protected readonly someSelected = computed(() => this.selectedCount() > 0 && !this.allSelected());
  // The single source of truth for what is shown; every change to it triggers one request.
  protected readonly query = signal<EmployeeQuery>({ page: 0, size: 20 });

  protected readonly filtered = computed(() => {
    const { search, country, department, minSalary, maxSalary } = this.query();
    return !!(search || country || department) || minSalary != null || maxSalary != null;
  });

  // The backend's total already reflects every active filter, so it is the count of matching records.
  protected readonly totalSuffix = computed(() => {
    const total = this.totalElements();
    const noun = total === 1 ? 'employee' : 'employees';
    if (!this.filtered()) {
      return noun;
    }
    return `${noun} ${total === 1 ? 'matches' : 'match'} the filters`;
  });
  protected readonly showTotal = computed(() => this.loaded() && !this.failed());

  constructor() {
    this.employeeService
      .departments()
      .pipe(
        // Without departments the filter is simply empty; the list itself still works.
        catchError(() => of([] as string[])),
        takeUntilDestroyed(),
      )
      .subscribe((departments) => this.departments.set(departments));

    this.search.valueChanges
      // Compared with the applied term, not the previous keystroke, so a search cleared while still being typed
      // does not send a request for a term the list no longer has.
      .pipe(
        debounceTime(300),
        filter((search) => search !== (this.query().search ?? '')),
        takeUntilDestroyed(),
      )
      .subscribe((search) => this.changeFilter({ search }));
    this.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((country) => {
      // A range typed for one currency means something else in another, so any country change clears it.
      this.minSalary.reset(null, { emitEvent: false });
      this.maxSalary.reset(null, { emitEvent: false });
      if (country) {
        this.minSalary.enable({ emitEvent: false });
        this.maxSalary.enable({ emitEvent: false });
      } else {
        this.minSalary.disable({ emitEvent: false });
        this.maxSalary.disable({ emitEvent: false });
      }
      this.changeFilter({ country, minSalary: null, maxSalary: null });
    });
    // The maximum's "not below the minimum" rule depends on the minimum, so it is checked again when that changes.
    this.minSalary.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.maxSalary.updateValueAndValidity({ emitEvent: false }));
    merge(this.minSalary.valueChanges, this.maxSalary.valueChanges)
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.changeSalaryRange());
    this.department.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((department) => this.changeFilter({ department }));

    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.failed.set(false);
          this.selection.set(new Set());
        }),
        // switchMap drops an in-flight request when a newer one starts, so a slow old answer cannot overwrite it.
        switchMap((query) =>
          this.employeeService.list(query).pipe(
            catchError(() => {
              this.failed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((page) => {
        this.loading.set(false);
        if (page) {
          this.employees.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loaded.set(true);
        }
      });
  }

  protected onPage(event: PageEvent): void {
    this.query.update((query) => ({ ...query, page: event.pageIndex, size: event.pageSize }));
  }

  // mat-table gives its cell templates an untyped row, so lookups go through a typed method.
  protected countryLabel(country: Country): string {
    return COUNTRY_LABELS[country];
  }

  protected confirmDelete(employee: Employee): void {
    const data: ConfirmDialogData = {
      title: 'Delete employee',
      message: `Delete ${employee.name} (${employee.email})? This cannot be undone.`,
      confirmLabel: 'Delete',
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.employeeService.delete(employee.id)),
      )
      .subscribe({
        next: () => this.reloadAfterDelete(1),
        error: () => this.actionError.set('Could not delete the employee. Please try again.'),
      });
  }

  protected toggleRow(employee: Employee): void {
    this.selection.update((selected) => {
      const next = new Set(selected);
      if (!next.delete(employee.id)) {
        next.add(employee.id);
      }
      return next;
    });
  }

  protected toggleAll(): void {
    this.selection.set(this.allSelected() ? new Set() : new Set(this.employees().map((employee) => employee.id)));
  }

  protected confirmBulkDelete(): void {
    const ids = [...this.selection()];
    const data: ConfirmDialogData = {
      title: 'Delete employees',
      message: `Delete ${ids.length} selected employee${ids.length === 1 ? '' : 's'}? This cannot be undone.`,
      confirmLabel: 'Delete',
    };
    this.dialog
      .open(ConfirmDialog, { data })
      .afterClosed()
      .pipe(
        filter(Boolean),
        switchMap(() => this.employeeService.deleteMany(ids)),
      )
      .subscribe({
        next: () => this.reloadAfterDelete(ids.length),
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            // Someone else removed some of them; nothing was deleted, so show the current list.
            this.actionError.set('Some of the selected employees no longer exist. The list was refreshed.');
            this.retry();
          } else {
            this.actionError.set('Could not delete the selected employees. Please try again.');
          }
        },
      });
  }

  protected clearFilters(): void {
    // Each reset also empties its input and, for the country, the salary range. They would each request the list
    // on their own, so the query is then replaced in one go (keeping the page size) and the requests merge into one.
    this.search.reset();
    this.country.reset();
    this.department.reset();
    this.query.update(({ size }) => ({ page: 0, size }));
  }

  protected salaryError(control: FormControl<number | null>): string {
    if (control.hasError('range')) {
      return 'Minimum must not exceed maximum';
    }
    return control.hasError('min') ? 'Must be 0 or more' : '';
  }

  protected retry(): void {
    // A new object, so the signal notifies even though nothing changed.
    this.query.update((query) => ({ ...query }));
  }

  private reloadAfterDelete(removed: number): void {
    this.actionError.set(null);
    // Deleting every row of a later page would leave that page empty, so step back one page.
    const emptiesPage = this.employees().length <= removed && this.query().page > 0;
    this.query.update((query) => ({ ...query, page: emptiesPage ? query.page - 1 : query.page }));
  }

  private belowMinimum(control: AbstractControl): ValidationErrors | null {
    const minimum = this.minSalary.value;
    return minimum != null && control.value != null && control.value < minimum ? { range: true } : null;
  }

  private changeSalaryRange(): void {
    // Errors show even if the user never left the field.
    this.minSalary.markAsTouched();
    this.maxSalary.markAsTouched();
    if (this.minSalary.invalid || this.maxSalary.invalid) {
      return;
    }
    this.changeFilter({ minSalary: this.minSalary.value, maxSalary: this.maxSalary.value });
  }

  // Any filter change starts again from the first page, otherwise the old page index may not exist any more.
  private changeFilter(filter: Partial<EmployeeQuery>): void {
    this.query.update((query) => ({ ...query, ...filter, page: 0 }));
  }
}
