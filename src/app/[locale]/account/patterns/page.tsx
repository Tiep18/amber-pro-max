import type {Locale} from '@/i18n/routing';
import {renderPatternLibraryPage} from './pattern-library-page';

export default async function AccountPatternsPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderPatternLibraryPage({params});
}
