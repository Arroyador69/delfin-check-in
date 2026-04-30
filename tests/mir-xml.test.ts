import { describe, expect, it } from 'vitest';
import { buildPvXml, createTestPvData } from '@/lib/mir-xml-official';
import { buildRhXml, createTestRhData } from '@/lib/mir-xml-rh';

describe('MIR XML (oficial)', () => {
  it('PV incluye soporteDocumento si hay numeroDocumento (default C)', () => {
    const input = createTestPvData();
    input.personas[0].soporteDocumento = undefined;
    input.personas[0].numeroDocumento = '12345678Z';
    const xml = buildPvXml(input);

    expect(xml).toContain('<numeroDocumento>12345678Z</numeroDocumento>');
    expect(xml).toContain('<soporteDocumento>C</soporteDocumento>');
  });

  it('PV no incluye soporteDocumento si no hay numeroDocumento', () => {
    const input = createTestPvData();
    input.personas[0].numeroDocumento = '';
    input.personas[0].soporteDocumento = undefined;
    const xml = buildPvXml(input);

    expect(xml).not.toContain('<soporteDocumento>');
  });

  it('RH no incluye soporteDocumento aunque venga en el input', () => {
    const input = createTestRhData();
    // createTestRhData trae soporteDocumento en el tipo por compatibilidad, pero el XSD RH no lo permite
    const xml = buildRhXml(input);
    expect(xml).not.toContain('<soporteDocumento>');
  });
});

