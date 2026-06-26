import { describe, expect, it } from 'vitest';
import { buildPvXml, createTestPvData } from '@/lib/mir-xml-official';
import { buildRhXml, createTestRhData } from '@/lib/mir-xml-rh';
import {
  mirRequiresSoporteDocumento,
  mirSoporteDocumentoKind,
  resolveSoporteDocumentoForMir,
  validateMirSoporteDocumento,
} from '@/lib/mir-soporte-documento';

describe('MIR soporteDocumento (NIF/NIE)', () => {
  it('exige soporte para NIF (DNI) y NIE; no para pasaporte', () => {
    expect(mirRequiresSoporteDocumento('NIF')).toBe(true);
    expect(mirRequiresSoporteDocumento('NIE')).toBe(true);
    expect(mirRequiresSoporteDocumento('PAS')).toBe(false);
    expect(mirSoporteDocumentoKind('NIF')).toBe('NIF');
    expect(mirSoporteDocumentoKind('NIE')).toBe('NIE');
  });

  it('valida soporte obligatorio en NIF y NIE con número de documento', () => {
    expect(validateMirSoporteDocumento('NIF', '', '12345678Z')).toMatch(/DNI/i);
    expect(validateMirSoporteDocumento('NIF', 'CAA000000', '12345678Z')).toBeNull();
    expect(validateMirSoporteDocumento('NIE', '', 'X1234567L')).toMatch(/NIE/i);
    expect(validateMirSoporteDocumento('NIE', 'E12345678', 'X1234567L')).toBeNull();
    expect(validateMirSoporteDocumento('PAS', '', 'AB123456')).toBeNull();
  });
});

describe('MIR XML (oficial)', () => {
  it('PV incluye soporteDocumento para NIF cuando viene informado', () => {
    const input = createTestPvData();
    input.personas[0].tipoDocumento = 'NIF';
    input.personas[0].numeroDocumento = '12345678Z';
    input.personas[0].soporteDocumento = 'CAA000000';
    const xml = buildPvXml(input);

    expect(xml).toContain('<soporteDocumento>CAA000000</soporteDocumento>');
  });

  it('PV incluye soporteDocumento para NIE cuando viene informado', () => {
    const input = createTestPvData();
    input.personas[0].tipoDocumento = 'NIE';
    input.personas[0].numeroDocumento = 'X1234567L';
    input.personas[0].soporteDocumento = 'E12345678';
    const xml = buildPvXml(input);

    expect(resolveSoporteDocumentoForMir('NIE', 'E12345678', 'X1234567L')).toBe('E12345678');
    expect(xml).toContain('<soporteDocumento>E12345678</soporteDocumento>');
  });

  it('PV no incluye soporteDocumento por defecto si falta (sin fallback C)', () => {
    const input = createTestPvData();
    input.personas[0].tipoDocumento = 'NIF';
    input.personas[0].numeroDocumento = '12345678Z';
    input.personas[0].soporteDocumento = undefined;
    const xml = buildPvXml(input);

    expect(xml).not.toContain('<soporteDocumento>');
  });

  it('PV no incluye soporteDocumento para pasaporte', () => {
    const input = createTestPvData();
    input.personas[0].tipoDocumento = 'PAS';
    input.personas[0].numeroDocumento = 'AB123456';
    input.personas[0].soporteDocumento = 'SHOULDNOT';
    const xml = buildPvXml(input);

    expect(xml).not.toContain('<soporteDocumento>');
  });

  it('RH no incluye soporteDocumento aunque venga en el input', () => {
    const input = createTestRhData();
    const xml = buildRhXml(input);
    expect(xml).not.toContain('<soporteDocumento>');
  });
});
