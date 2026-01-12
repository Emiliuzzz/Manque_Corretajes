import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PropiedadDetalleComponent } from './propiedad-detalle.component';

describe('PropiedadDetalle', () => {
  let component: PropiedadDetalleComponent;
  let fixture: ComponentFixture<PropiedadDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PropiedadDetalleComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PropiedadDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
