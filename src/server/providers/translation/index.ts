import { translateLibre } from './libre';
import { translateDeepL } from './deepl';
import { translateGoogle } from './google';
import { translateYandex } from './yandex';
import { translateLingva } from './lingva';
import { translateOneRing } from './onering';
import { translateDeepLX } from './deeplx';
import { translateBing } from './bing';
import { secretManager } from '@/server/services/secrets.service';
import type { TranslationProvider } from '@/shared/types/translation';
import type { SecretKey } from '@/shared/types/secret';
import { ApiError } from '@/server/errors';

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  provider: TranslationProvider,
): Promise<string> {
  switch (provider) {
    case 'libre': {
      const secret = await secretManager.read('libre_url' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'libre_url not configured', 500);
      return translateLibre(text, sourceLang, targetLang, secret.value);
    }
    case 'deepl': {
      const secret = await secretManager.read('deepl_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'deepl_key not configured', 500);
      return translateDeepL(text, sourceLang, targetLang, secret.value);
    }
    case 'google': {
      const secret = await secretManager.read('google_translate_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'google_translate_key not configured', 500);
      return translateGoogle(text, sourceLang, targetLang, secret.value);
    }
    case 'yandex': {
      const secret = await secretManager.read('yandex_translate_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'yandex_translate_key not configured', 500);
      return translateYandex(text, sourceLang, targetLang, secret.value);
    }
    case 'lingva': {
      const secret = await secretManager.read('lingva_url' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'lingva_url not configured', 500);
      return translateLingva(text, sourceLang, targetLang, secret.value);
    }
    case 'onering': {
      const secret = await secretManager.read('oneringtranslator_url' as SecretKey);
      if (!secret)
        throw new ApiError('MISSING_SECRET', 'oneringtranslator_url not configured', 500);
      return translateOneRing(text, sourceLang, targetLang, secret.value);
    }
    case 'deeplx': {
      const secret = await secretManager.read('deeplx_url' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'deeplx_url not configured', 500);
      return translateDeepLX(text, sourceLang, targetLang, secret.value);
    }
    case 'bing': {
      const secret = await secretManager.read('bing_translate_key' as SecretKey);
      if (!secret) throw new ApiError('MISSING_SECRET', 'bing_translate_key not configured', 500);
      return translateBing(text, sourceLang, targetLang, secret.value);
    }
    default:
      throw new ApiError('UNKNOWN_PROVIDER', `Unknown translation provider: ${provider}`, 400);
  }
}
