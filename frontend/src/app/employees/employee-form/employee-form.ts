import { Component } from '@angular/core';

// Serves both /employees/new and /employees/:id/edit.
@Component({
  selector: 'app-employee-form',
  template: '<h1>Employee</h1>',
})
export class EmployeeForm {}
