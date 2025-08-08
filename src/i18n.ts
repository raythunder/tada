// src/i18n.ts
import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

import translationEN from './locales/en/translation.json';
import translationZH_CN from './locales/zh-CN/translation.json';

// the translations
const resources = {
    en: {
        translation: translationEN,
    },
    'zh-CN': {
        translation: translationZH_CN,
    },
};

i18n
    .use(initReactI18next) // passes i18n down to react-i18next
    .init({
        resources,
        lng: 'zh-CN', // <<<--- 修改这里：将 'en' 改为 'zh-CN'
        fallbackLng: 'zh-CN', // <<<--- 修改这里：将 'en' 改为 'zh-CN'

        interpolation: {
            escapeValue: false, // react already safes from xss
        },
    });

export default i18n;