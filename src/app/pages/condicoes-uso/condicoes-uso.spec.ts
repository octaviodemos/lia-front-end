import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CondicoesUso } from './condicoes-uso';

describe('CondicoesUso', () => {
  let component: CondicoesUso;
  let fixture: ComponentFixture<CondicoesUso>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CondicoesUso]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CondicoesUso);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
