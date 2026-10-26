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

  it('acepta .com con teléfono móvil ES sin TLD .es', () => {
    const v = classifySpainVacationRental(
      'https://www.gestora-vacacional.com',
      `<html><body>
        Gestión alquiler vacacional. Para propietarios. Reservas. Contacto 612 345 678.
        Política de privacidad. Aviso legal.
      </body></html>`
    );
    expect(v.ok).toBe(true);
    expect(v.audience).toBe('agency');
  });

  it('rechaza .com sin señal España', () => {
    const v = classifySpainVacationRental(
      'https://www.beachvilla.mx',
      '<html><body>Vacation rental villa booking nights guests</body></html>'
    );
    expect(v.ok).toBe(false);
  });

  it('rechaza directorios / portales', () => {
    const v = classifySpainVacationRental(
      'https://www.casasruralesenasturias.com',
      `<html lang="es"><body>
        Directorio de casas rurales en Asturias. Más de 200 alojamientos. Busca tu casa rural.
      </body></html>`
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toMatch(/directorio/);
  });

  it('acepta agencia gestión alquiler vacacional ES', () => {
    const v = classifySpainVacationRental(
      'https://www.silastur.es',
      `<html lang="es"><body>
        Gestión alquiler vacacional Asturias. Para propietarios. Gestionamos tu vivienda vacacional.
        Registro de viajeros. Teléfono +34 985 875 010. España.
      </body></html>`
    );
    expect(v.ok).toBe(true);
    expect(v.audience).toBe('agency');
  });

  it('acepta hotel ES con parte viajeros', () => {
    const v = classifySpainVacationRental(
      'https://www.hoteldemo.es',
      `<html lang="es"><body>
        Hotel en Sevilla. Habitaciones dobles. Reservas. Check-in. Tel +34 954 000 000
      </body></html>`
    );
    expect(v.ok).toBe(true);
    expect(v.audience).toBe('hotel');
  });

  it('rechaza inmobiliaria pura sin vacacional', () => {
    const v = classifySpainVacationRental(
      'https://www.inmo-ejemplo.es',
      `<html lang="es"><body>
        Inmobiliaria en Madrid. Compraventa de pisos y locales. Hipotecas.
      </body></html>`
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
