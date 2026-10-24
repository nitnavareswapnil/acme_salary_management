import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { EmployeeService } from '../../core/employee.service';
import { COUNTRY_LABELS, Country, Employee, EmployeeQuery } from '../../core/models';

@Component({
  selector: 'app-employee-list',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    MatButtonModule,
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

  protected readonly columns = ['name', 'email', 'jobTitle', 'department', 'country', 'baseSalary', 'currency'];
  protected readonly countries = Object.keys(COUNTRY_LABELS) as Country[];
  protected readonly countryLabels = COUNTRY_LABELS;
  // Matches the largest page the backend allows.
  protected readonly pageSizeOptions = [10, 20, 50, 100];

  readonly search = new FormControl('', { nonNullable: true });
  readonly country = new FormControl<Country | ''>('', { nonNullable: true });
  readonly department = new FormControl('', { nonNullable: true });

  readonly departments = signal<string[]>([]);
  protected readonly employees = signal<Employee[]>([]);
  protected readonly totalElements = signal(0);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  // The single source of truth for what is shown; every change to it triggers one request.
  protected readonly query = signal<EmployeeQuery>({ page: 0, size: 20 });

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
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => this.changeFilter({ search }));
    this.country.valueChanges.pipe(takeUntilDestroyed()).subscribe((country) => this.changeFilter({ country }));
    this.department.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((department) => this.changeFilter({ department }));

    toObservable(this.query)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.failed.set(false);
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

  protected retry(): void {
    // A new object, so the signal notifies even though nothing changed.
    this.query.update((query) => ({ ...query }));
  }

  // Any filter change starts again from the first page, otherwise the old page index may not exist any more.
  private changeFilter(filter: Partial<EmployeeQuery>): void {
    this.query.update((query) => ({ ...query, ...filter, page: 0 }));
  }
}
