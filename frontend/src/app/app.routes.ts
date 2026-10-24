import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'employees' },
  {
    path: 'employees',
    loadComponent: () =>
      import('./employees/employee-list/employee-list').then((m) => m.EmployeeList),
  },
  {
    path: 'employees/new',
    loadComponent: () =>
      import('./employees/employee-form/employee-form').then((m) => m.EmployeeForm),
  },
  {
    path: 'employees/:id/edit',
    loadComponent: () =>
      import('./employees/employee-form/employee-form').then((m) => m.EmployeeForm),
  },
  {
    path: 'insights',
    loadComponent: () =>
      import('./insights/insights-page/insights-page').then((m) => m.InsightsPage),
  },
];
