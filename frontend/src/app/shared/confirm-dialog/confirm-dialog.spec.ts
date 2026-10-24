import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  const close = vi.fn();

  beforeEach(async () => {
    close.mockClear();
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { title: 'Delete employee', message: 'Delete Asha Rao?', confirmLabel: 'Delete' },
        },
      ],
    }).compileComponents();
  });

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(ConfirmDialog);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the title, message and confirm label', () => {
    const element = render();

    expect(element.textContent).toContain('Delete employee');
    expect(element.textContent).toContain('Delete Asha Rao?');
    expect(element.querySelector('button.confirm')?.textContent).toContain('Delete');
  });

  it('closes with true when confirmed', () => {
    (render().querySelector('button.confirm') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith(true);
  });

  it('closes with false when cancelled', () => {
    (render().querySelector('button.cancel') as HTMLButtonElement).click();

    expect(close).toHaveBeenCalledWith(false);
  });
});
