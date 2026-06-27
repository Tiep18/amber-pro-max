'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  taxonomyConfigFor,
  type TaxonomySectionConfig,
  type TaxonomyTextField
} from './taxonomy-admin';

const localeSchema = z.enum(['vi', 'en']);
const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const taxonomyFormSchema = z.object({
  section: z.string().trim().min(1),
  termId: z.string().trim().optional()
});

function value(formData: FormData, locale: 'vi' | 'en', field: TaxonomyTextField) {
  return String(formData.get(`${locale}.${field}`) ?? '').trim();
}

function fieldColumn(field: TaxonomyTextField) {
  return field === 'seoTitle'
    ? 'seo_title'
    : field === 'seoDescription'
      ? 'seo_description'
      : field;
}

function validateRequiredFields(config: TaxonomySectionConfig, formData: FormData) {
  for (const locale of localeSchema.options) {
    const name = value(formData, locale, 'name');
    if (!name || name.length > 160) {
      return false;
    }
    if (config.fields.includes('slug')) {
      const slug = value(formData, locale, 'slug');
      if (!slugSchema.safeParse(slug).success || slug.length > 200) {
        return false;
      }
    }
  }
  return true;
}

function translationPayload(
  config: TaxonomySectionConfig,
  termId: string,
  locale: 'vi' | 'en',
  formData: FormData
) {
  const payload: Record<string, string | null> = {
    [config.parentIdColumn]: termId,
    locale
  };

  for (const field of config.fields) {
    const raw = value(formData, locale, field);
    const column = fieldColumn(field);
    payload[column] = field === 'seoTitle' || field === 'seoDescription' ? raw || null : raw;
  }

  return payload;
}

function pathsFor(section: string) {
  const catalog = ['category', 'tag', 'technique', 'collection'].includes(section);
  return catalog
    ? ['/admin/catalog/taxonomy', '/admin/catalog', '/admin/catalog/new']
    : ['/admin/blog/taxonomy', '/admin/blog', '/admin/blog/new'];
}

function redirectFor(section: string, status: 'saved' | 'invalid' | 'error'): never {
  const base = pathsFor(section)[0];
  redirect(`${base}?${status}=1`);
}

export async function saveTaxonomyTermAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = taxonomyFormSchema.safeParse({
    section: formData.get('section'),
    termId: formData.get('termId') || undefined
  });

  if (!parsed.success) {
    redirect('/admin?invalid=1');
  }

  const config = taxonomyConfigFor(parsed.data.section);
  if (!config || !validateRequiredFields(config, formData)) {
    redirectFor(parsed.data.section, 'invalid');
  }

  const supabase = await createSupabaseServerClient();
  let termId = parsed.data.termId;

  if (termId) {
    const { error } = await supabase
      .from(config.parentTable as never)
      .update({ updated_at: new Date().toISOString() } as never)
      .eq('id', termId);
    if (error) {
      redirectFor(config.key, 'error');
    }
  } else {
    const { data, error } = await supabase
      .from(config.parentTable as never)
      .insert({} as never)
      .select('id')
      .single();
    if (error || !data) {
      redirectFor(config.key, 'error');
    }
    termId = (data as unknown as { id: string }).id;
  }

  const translations = localeSchema.options.map((locale) =>
    translationPayload(config, termId, locale, formData)
  );
  const { error } = await supabase
    .from(config.translationTable as never)
    .upsert(translations as never, { onConflict: `${config.parentIdColumn},locale` });

  if (error) {
    redirectFor(config.key, 'error');
  }

  for (const path of pathsFor(config.key)) {
    revalidatePath(path);
  }

  redirectFor(config.key, 'saved');
}
