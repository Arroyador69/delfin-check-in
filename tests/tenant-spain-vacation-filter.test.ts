import { describe, expect, it } from 'vitest';
import {
  classifySpainVacationRental,
  hostSuggestsNonVacation,
} from '../src/lib/public-owner-leads/spain-vacation-filter';
import {
  signOutreachActivate,
  verifyOutreachActivateSignature,
} from '../src/lib/public-owner-leads/activate-link';

describe('spain vacation filter', () => {
  it('rechaza seguros', () => {
    expect(hostSuggestsNonVacation('https://seguros-hogar.es')).toBe(true);
    const v = classifySpainVacationRental(
      'https://www.ejemplo-seguros.es',
      '<html lang="es"><body>Correduría de seguros y pólizas para tu hogar en España</body></html>'
    );
    expect(v.ok).toBe(false);
  });

  it('acepta casa rural ES', () => {
    const v = classifySpainVacationRental(
      'https://www.casaruraldemo.es',
      `<html lang="es"><body>
        Casa rural en Galicia. Alquiler vacacional. Reserva noches. Capacidad 8 personas. Tel +34 600 000 000
      </body></html>`
    );
    expect(v.ok).toBe(true);
    expect(v.spain).toBe(true);
    expect(v.vacation).toBe(true);
  });

  it('acepta .com español con +34 / provincia (sin exigir .es)', () => {
    const v = classifySpainVacationRental(
      'https://www.casaruralasturias.com',
      `<html lang="es"><body>
        Casa rural en Asturias. Turismo rural. Reservas. Teléfono +34 985 000 000
      </body></html>`
    );
    expect(v.ok).toBe(true);
    expect(v.spain).toBe(true);
  });

  it('rechaza .com sin señal España', () => {
    const v = classifySpainVacationRental(
      'https://www.beachvilla.mx',
      '<html><body>Vacation rental villa booking nights guests</body></html>'
    );
    expect(v.ok).toBe(false);
  });
});

describe('outreach activate signature', () => {
  it('firma y verifica', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const sig = signOutreachActivate('dueño@casa.es', exp);
    expect(verifyOutreachActivateSignature('dueño@casa.es', exp, sig)).toBe(true);
    expect(verifyOutreachActivateSignature('otro@casa.es', exp, sig)).toBe(false);
  });
});
