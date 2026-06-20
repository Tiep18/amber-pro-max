import type {Locale} from '@/i18n/routing';
import {renderPatternLibraryPage} from '../../account/patterns/pattern-library-page';

export default async function VietnamesePatternLibraryPage({params}: {params: Promise<{locale: Locale}>}) {
  return renderPatternLibraryPage({params, expectedLocale: 'vi'});
}
