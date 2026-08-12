import { describe, expect, it } from 'vitest';
import { damerauLevenshtein, suggestEmailCorrection } from '@/checkout/email-suggestion';

describe('damerauLevenshtein', () => {
  it('scores an adjacent transposition as a single edit', () => {
    expect(damerauLevenshtein('gmial.com', 'gmail.com')).toBe(1);
  });

  it('scores identical, inserted, and substituted characters', () => {
    expect(damerauLevenshtein('gmail.com', 'gmail.com')).toBe(0);
    expect(damerauLevenshtein('gmai.com', 'gmail.com')).toBe(1);
    expect(damerauLevenshtein('gnail.com', 'gmail.com')).toBe(1);
    expect(damerauLevenshtein('yahoo.com', 'gmail.com')).toBeGreaterThan(2);
  });
});

describe('suggestEmailCorrection', () => {
  it('corrects the typos that actually cost a customer their download', () => {
    expect(suggestEmailCorrection('mai@gmial.com')).toBe('mai@gmail.com');
    expect(suggestEmailCorrection('mai@gmai.com')).toBe('mai@gmail.com');
    expect(suggestEmailCorrection('mai@gnail.com')).toBe('mai@gmail.com');
    expect(suggestEmailCorrection('mai@gmail.co')).toBe('mai@gmail.com');
    expect(suggestEmailCorrection('mai@hotmial.com')).toBe('mai@hotmail.com');
    expect(suggestEmailCorrection('mai@yaho.com')).toBe('mai@yahoo.com');
    expect(suggestEmailCorrection('mai@outlok.com')).toBe('mai@outlook.com');
    expect(suggestEmailCorrection('mai@iclod.com')).toBe('mai@icloud.com');
  });

  it('corrects multi-edit typos listed explicitly', () => {
    expect(suggestEmailCorrection('mai@gmial.co')).toBe('mai@gmail.com');
    expect(suggestEmailCorrection('mai@gnail.con')).toBe('mai@gmail.com');
  });

  it('corrects a mistyped .com on an otherwise unknown domain', () => {
    expect(suggestEmailCorrection('ana@thuvienlen.con')).toBe('ana@thuvienlen.com');
    expect(suggestEmailCorrection('ana@thuvienlen.cmo')).toBe('ana@thuvienlen.com');
  });

  it('stays silent on addresses that are already right', () => {
    expect(suggestEmailCorrection('mai@gmail.com')).toBeNull();
    expect(suggestEmailCorrection('mai@yahoo.com.vn')).toBeNull();
    expect(suggestEmailCorrection('MAI@GMAIL.COM')).toBeNull();
  });

  it('does not guess at real domains it has never seen', () => {
    expect(suggestEmailCorrection('sales@amberhandmade.vn')).toBeNull();
    expect(suggestEmailCorrection('taylor@some-company.co.uk')).toBeNull();
    expect(suggestEmailCorrection('taylor@mail.ru')).toBeNull();
    // `.co` is a real ccTLD on a domain we do not recognise, so leave it alone.
    expect(suggestEmailCorrection('taylor@studio.co')).toBeNull();
  });

  it('ignores input that is not a single addressable email', () => {
    expect(suggestEmailCorrection('')).toBeNull();
    expect(suggestEmailCorrection('not-an-email')).toBeNull();
    expect(suggestEmailCorrection('@gmial.com')).toBeNull();
    expect(suggestEmailCorrection('mai@')).toBeNull();
    expect(suggestEmailCorrection('mai@localhost')).toBeNull();
    expect(suggestEmailCorrection('mai @gmial.com')).toBeNull();
  });

  it('keeps the local part exactly as typed', () => {
    expect(suggestEmailCorrection('  Mai.Nguyen+shop@gmial.com  ')).toBe(
      'Mai.Nguyen+shop@gmail.com'
    );
  });
});
