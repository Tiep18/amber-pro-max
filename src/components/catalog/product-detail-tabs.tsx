'use client';

import {useMemo, useState} from 'react';

type DetailTab = 'description' | 'details' | 'care';

type ProductDetailTabsProps = {
  locale: 'vi' | 'en';
  productType: 'pdf_pattern' | 'physical_finished';
  description: string;
  specs: Record<string, string>;
};

const labels = {
  en: {
    description: 'Description',
    details: 'Details',
    care: 'Care',
    delivery: 'Download',
    storyTitle: 'What you will receive',
    detailsTitle: 'Product details',
    careTitle: 'Care guidance',
    emptyDetails: 'Detailed specifications will be added soon.',
    handmadeCare: [
      'Hand wash gently in cool water.',
      'Do not wring strongly; reshape and dry flat.',
      'Avoid machine washing, tumble drying, and direct heat.'
    ],
    pdfCare: [
      'Digital PDF access is available after confirmed payment.',
      'Keep a backup copy of your pattern file after downloading.',
      'Contact the shop if you need help opening your pattern.'
    ]
  },
  vi: {
    description: 'Mo ta',
    details: 'Chi tiet',
    care: 'Cham soc',
    delivery: 'Tai ve',
    storyTitle: 'Ban se nhan duoc',
    detailsTitle: 'Thong tin san pham',
    careTitle: 'Huong dan cham soc',
    emptyDetails: 'Thong tin ky thuat chi tiet se duoc bo sung som.',
    handmadeCare: [
      'Giat tay nhe voi nuoc mat.',
      'Khong vat manh; chinh lai form va phoi ngang.',
      'Tranh giat may, say nong, va nhiet truc tiep.'
    ],
    pdfCare: [
      'File PDF duoc mo quyen tai sau khi xac nhan thanh toan.',
      'Hay luu them mot ban sao sau khi tai mau.',
      'Lien he shop neu ban can ho tro mo file mau.'
    ]
  }
} as const;

function humanizeSpecKey(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ProductDetailTabs({locale, productType, description, specs}: ProductDetailTabsProps) {
  const t = labels[locale];
  const [active, setActive] = useState<DetailTab>('description');
  const specRows = useMemo(
    () => Object.entries(specs).filter(([, value]) => value.trim().length > 0),
    [specs]
  );
  const careItems = productType === 'pdf_pattern' ? t.pdfCare : t.handmadeCare;
  const tabs: Array<{id: DetailTab; label: string}> = [
    {id: 'description', label: t.description},
    {id: 'details', label: t.details},
    {id: 'care', label: productType === 'pdf_pattern' ? t.delivery : t.care}
  ];

  return (
    <section className="grid gap-5 border-t border-[var(--border)] pt-8 lg:pt-10">
      <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)]" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            className={`min-h-10 whitespace-nowrap border-b-2 px-3 text-sm font-semibold transition-colors ${
              active === tab.id
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'description' ? (
        <article className="grid max-w-3xl gap-3">
          <h2 className="text-xl font-semibold leading-tight">{t.storyTitle}</h2>
          <p className="text-pretty leading-relaxed text-[var(--muted-foreground)]">{description}</p>
        </article>
      ) : null}

      {active === 'details' ? (
        <article className="grid gap-4">
          <h2 className="text-xl font-semibold leading-tight">{t.detailsTitle}</h2>
          {specRows.length ? (
            <dl className="grid overflow-hidden border-y border-[var(--border)] sm:grid-cols-[220px_1fr]">
              {specRows.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="border-b border-[var(--border)] py-3 pr-4 text-sm font-semibold">
                    {humanizeSpecKey(key)}
                  </dt>
                  <dd className="border-b border-[var(--border)] py-3 text-sm text-[var(--muted-foreground)] sm:px-4">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[var(--muted-foreground)]">{t.emptyDetails}</p>
          )}
        </article>
      ) : null}

      {active === 'care' ? (
        <article className="grid max-w-3xl gap-3">
          <h2 className="text-xl font-semibold leading-tight">{t.careTitle}</h2>
          <ul className="grid gap-2 text-[var(--muted-foreground)]">
            {careItems.map((item) => (
              <li key={item} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
