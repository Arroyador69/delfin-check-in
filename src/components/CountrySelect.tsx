'use client';

import React, { useState, useEffect } from 'react';

interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  name?: string;
  language?: string;
}

// Países completos hardcodeados para evitar imports dinámicos
const ALL_COUNTRIES = [
  { iso3: 'AFG', name: { es: 'Afganistán', en: 'Afghanistan', fr: 'Afghanistan', ru: 'Афганистан' } },
  { iso3: 'ALA', name: { es: 'Islas Åland', en: 'Åland Islands', fr: 'Îles Åland', ru: 'Аландские острова' } },
  { iso3: 'ALB', name: { es: 'Albania', en: 'Albania', fr: 'Albanie', ru: 'Албания' } },
  { iso3: 'DZA', name: { es: 'Argelia', en: 'Algeria', fr: 'Algérie', ru: 'Алжир' } },
  { iso3: 'ASM', name: { es: 'Samoa Americana', en: 'American Samoa', fr: 'Samoa américaines', ru: 'Американское Самоа' } },
  { iso3: 'AND', name: { es: 'Andorra', en: 'Andorra', fr: 'Andorre', ru: 'Андорра' } },
  { iso3: 'AGO', name: { es: 'Angola', en: 'Angola', fr: 'Angola', ru: 'Ангола' } },
  { iso3: 'AIA', name: { es: 'Anguila', en: 'Anguilla', fr: 'Anguilla', ru: 'Ангилья' } },
  { iso3: 'ATA', name: { es: 'Antártida', en: 'Antarctica', fr: 'Antarctique', ru: 'Антарктида' } },
  { iso3: 'ATG', name: { es: 'Antigua y Barbuda', en: 'Antigua and Barbuda', fr: 'Antigua-et-Barbuda', ru: 'Антигуа и Барбуда' } },
  { iso3: 'ARG', name: { es: 'Argentina', en: 'Argentina', fr: 'Argentine', ru: 'Аргентина' } },
  { iso3: 'ARM', name: { es: 'Armenia', en: 'Armenia', fr: 'Arménie', ru: 'Армения' } },
  { iso3: 'ABW', name: { es: 'Aruba', en: 'Aruba', fr: 'Aruba', ru: 'Аруба' } },
  { iso3: 'AUS', name: { es: 'Australia', en: 'Australia', fr: 'Australie', ru: 'Австралия' } },
  { iso3: 'AUT', name: { es: 'Austria', en: 'Austria', fr: 'Autriche', ru: 'Австрия' } },
  { iso3: 'AZE', name: { es: 'Azerbaiyán', en: 'Azerbaijan', fr: 'Azerbaïdjan', ru: 'Азербайджан' } },
  { iso3: 'BHS', name: { es: 'Bahamas', en: 'Bahamas', fr: 'Bahamas', ru: 'Багамские острова' } },
  { iso3: 'BHR', name: { es: 'Baréin', en: 'Bahrain', fr: 'Bahreïn', ru: 'Бахрейн' } },
  { iso3: 'BGD', name: { es: 'Bangladesh', en: 'Bangladesh', fr: 'Bangladesh', ru: 'Бангладеш' } },
  { iso3: 'BRB', name: { es: 'Barbados', en: 'Barbados', fr: 'Barbade', ru: 'Барбадос' } },
  { iso3: 'BLR', name: { es: 'Bielorrusia', en: 'Belarus', fr: 'Biélorussie', ru: 'Беларусь' } },
  { iso3: 'BEL', name: { es: 'Bélgica', en: 'Belgium', fr: 'Belgique', ru: 'Бельгия' } },
  { iso3: 'BLZ', name: { es: 'Belice', en: 'Belize', fr: 'Belize', ru: 'Белиз' } },
  { iso3: 'BEN', name: { es: 'Benín', en: 'Benin', fr: 'Bénin', ru: 'Бенин' } },
  { iso3: 'BMU', name: { es: 'Bermudas', en: 'Bermuda', fr: 'Bermudes', ru: 'Бермуды' } },
  { iso3: 'BTN', name: { es: 'Bután', en: 'Bhutan', fr: 'Bhoutan', ru: 'Бутан' } },
  { iso3: 'BOL', name: { es: 'Bolivia', en: 'Bolivia', fr: 'Bolivie', ru: 'Боливия' } },
  { iso3: 'BIH', name: { es: 'Bosnia y Herzegovina', en: 'Bosnia and Herzegovina', fr: 'Bosnie-Herzégovine', ru: 'Босния и Герцеговина' } },
  { iso3: 'BWA', name: { es: 'Botsuana', en: 'Botswana', fr: 'Botswana', ru: 'Ботсвана' } },
  { iso3: 'BRA', name: { es: 'Brasil', en: 'Brazil', fr: 'Brésil', ru: 'Бразилия' } },
  { iso3: 'VGB', name: { es: 'Islas Vírgenes Británicas', en: 'British Virgin Islands', fr: 'Îles Vierges britanniques', ru: 'Британские Виргинские острова' } },
  { iso3: 'BRN', name: { es: 'Brunéi', en: 'Brunei', fr: 'Brunei', ru: 'Бруней' } },
  { iso3: 'BGR', name: { es: 'Bulgaria', en: 'Bulgaria', fr: 'Bulgarie', ru: 'Болгария' } },
  { iso3: 'BFA', name: { es: 'Burkina Faso', en: 'Burkina Faso', fr: 'Burkina Faso', ru: 'Буркина-Фасо' } },
  { iso3: 'BDI', name: { es: 'Burundi', en: 'Burundi', fr: 'Burundi', ru: 'Бурунди' } },
  { iso3: 'KHM', name: { es: 'Camboya', en: 'Cambodia', fr: 'Cambodge', ru: 'Камбоджа' } },
  { iso3: 'CMR', name: { es: 'Camerún', en: 'Cameroon', fr: 'Cameroun', ru: 'Камерун' } },
  { iso3: 'CAN', name: { es: 'Canadá', en: 'Canada', fr: 'Canada', ru: 'Канада' } },
  { iso3: 'CPV', name: { es: 'Cabo Verde', en: 'Cape Verde', fr: 'Cap-Vert', ru: 'Кабо-Верде' } },
  { iso3: 'CYM', name: { es: 'Islas Caimán', en: 'Cayman Islands', fr: 'Îles Caïmans', ru: 'Острова Кайман' } },
  { iso3: 'CAF', name: { es: 'República Centroafricana', en: 'Central African Republic', fr: 'République centrafricaine', ru: 'Центральноафриканская Республика' } },
  { iso3: 'TCD', name: { es: 'Chad', en: 'Chad', fr: 'Tchad', ru: 'Чад' } },
  { iso3: 'CHL', name: { es: 'Chile', en: 'Chile', fr: 'Chili', ru: 'Чили' } },
  { iso3: 'CHN', name: { es: 'China', en: 'China', fr: 'Chine', ru: 'Китай' } },
  { iso3: 'HKG', name: { es: 'Hong Kong', en: 'Hong Kong', fr: 'Hong Kong', ru: 'Гонконг' } },
  { iso3: 'MAC', name: { es: 'Macao', en: 'Macau', fr: 'Macao', ru: 'Макао' } },
  { iso3: 'TWN', name: { es: 'Taiwán', en: 'Taiwan', fr: 'Taïwan', ru: 'Тайвань' } },
  { iso3: 'COL', name: { es: 'Colombia', en: 'Colombia', fr: 'Colombie', ru: 'Колумбия' } },
  { iso3: 'COM', name: { es: 'Comoras', en: 'Comoros', fr: 'Comores', ru: 'Коморы' } },
  { iso3: 'COG', name: { es: 'Congo', en: 'Congo', fr: 'Congo', ru: 'Конго' } },
  { iso3: 'COD', name: { es: 'República Democrática del Congo', en: 'Democratic Republic of the Congo', fr: 'République démocratique du Congo', ru: 'Демократическая Республика Конго' } },
  { iso3: 'COK', name: { es: 'Islas Cook', en: 'Cook Islands', fr: 'Îles Cook', ru: 'Острова Кука' } },
  { iso3: 'CRI', name: { es: 'Costa Rica', en: 'Costa Rica', fr: 'Costa Rica', ru: 'Коста-Рика' } },
  { iso3: 'CIV', name: { es: 'Costa de Marfil', en: 'Côte d\'Ivoire', fr: 'Côte d\'Ivoire', ru: 'Кот-д\'Ивуар' } },
  { iso3: 'HRV', name: { es: 'Croacia', en: 'Croatia', fr: 'Croatie', ru: 'Хорватия' } },
  { iso3: 'CUB', name: { es: 'Cuba', en: 'Cuba', fr: 'Cuba', ru: 'Куба' } },
  { iso3: 'CYP', name: { es: 'Chipre', en: 'Cyprus', fr: 'Chypre', ru: 'Кипр' } },
  { iso3: 'CZE', name: { es: 'República Checa', en: 'Czech Republic', fr: 'République tchèque', ru: 'Чехия' } },
  { iso3: 'DNK', name: { es: 'Dinamarca', en: 'Denmark', fr: 'Danemark', ru: 'Дания' } },
  { iso3: 'DJI', name: { es: 'Yibuti', en: 'Djibouti', fr: 'Djibouti', ru: 'Джибути' } },
  { iso3: 'DMA', name: { es: 'Dominica', en: 'Dominica', fr: 'Dominique', ru: 'Доминика' } },
  { iso3: 'DOM', name: { es: 'República Dominicana', en: 'Dominican Republic', fr: 'République dominicaine', ru: 'Доминиканская Республика' } },
  { iso3: 'ECU', name: { es: 'Ecuador', en: 'Ecuador', fr: 'Équateur', ru: 'Эквадор' } },
  { iso3: 'EGY', name: { es: 'Egipto', en: 'Egypt', fr: 'Égypte', ru: 'Египет' } },
  { iso3: 'SLV', name: { es: 'El Salvador', en: 'El Salvador', fr: 'Salvador', ru: 'Сальвадор' } },
  { iso3: 'GNQ', name: { es: 'Guinea Ecuatorial', en: 'Equatorial Guinea', fr: 'Guinée équatoriale', ru: 'Экваториальная Гвинея' } },
  { iso3: 'ERI', name: { es: 'Eritrea', en: 'Eritrea', fr: 'Érythrée', ru: 'Эритрея' } },
  { iso3: 'EST', name: { es: 'Estonia', en: 'Estonia', fr: 'Estonie', ru: 'Эстония' } },
  { iso3: 'ETH', name: { es: 'Etiopía', en: 'Ethiopia', fr: 'Éthiopie', ru: 'Эфиопия' } },
  { iso3: 'FLK', name: { es: 'Islas Malvinas', en: 'Falkland Islands', fr: 'Îles Malouines', ru: 'Фолклендские острова' } },
  { iso3: 'FRO', name: { es: 'Islas Feroe', en: 'Faroe Islands', fr: 'Îles Féroé', ru: 'Фарерские острова' } },
  { iso3: 'FJI', name: { es: 'Fiyi', en: 'Fiji', fr: 'Fidji', ru: 'Фиджи' } },
  { iso3: 'FIN', name: { es: 'Finlandia', en: 'Finland', fr: 'Finlande', ru: 'Финляндия' } },
  { iso3: 'FRA', name: { es: 'Francia', en: 'France', fr: 'France', ru: 'Франция' } },
  { iso3: 'GUF', name: { es: 'Guayana Francesa', en: 'French Guiana', fr: 'Guyane française', ru: 'Французская Гвиана' } },
  { iso3: 'PYF', name: { es: 'Polinesia Francesa', en: 'French Polynesia', fr: 'Polynésie française', ru: 'Французская Полинезия' } },
  { iso3: 'GAB', name: { es: 'Gabón', en: 'Gabon', fr: 'Gabon', ru: 'Габон' } },
  { iso3: 'GMB', name: { es: 'Gambia', en: 'Gambia', fr: 'Gambie', ru: 'Гамбия' } },
  { iso3: 'GEO', name: { es: 'Georgia', en: 'Georgia', fr: 'Géorgie', ru: 'Грузия' } },
  { iso3: 'DEU', name: { es: 'Alemania', en: 'Germany', fr: 'Allemagne', ru: 'Германия' } },
  { iso3: 'GHA', name: { es: 'Ghana', en: 'Ghana', fr: 'Ghana', ru: 'Гана' } },
  { iso3: 'GIB', name: { es: 'Gibraltar', en: 'Gibraltar', fr: 'Gibraltar', ru: 'Гибралтар' } },
  { iso3: 'GRC', name: { es: 'Grecia', en: 'Greece', fr: 'Grèce', ru: 'Греция' } },
  { iso3: 'GRL', name: { es: 'Groenlandia', en: 'Greenland', fr: 'Groenland', ru: 'Гренландия' } },
  { iso3: 'GRD', name: { es: 'Granada', en: 'Grenada', fr: 'Grenade', ru: 'Гренада' } },
  { iso3: 'GLP', name: { es: 'Guadalupe', en: 'Guadeloupe', fr: 'Guadeloupe', ru: 'Гваделупа' } },
  { iso3: 'GUM', name: { es: 'Guam', en: 'Guam', fr: 'Guam', ru: 'Гуам' } },
  { iso3: 'GTM', name: { es: 'Guatemala', en: 'Guatemala', fr: 'Guatemala', ru: 'Гватемала' } },
  { iso3: 'GGY', name: { es: 'Guernsey', en: 'Guernsey', fr: 'Guernesey', ru: 'Гернси' } },
  { iso3: 'GIN', name: { es: 'Guinea', en: 'Guinea', fr: 'Guinée', ru: 'Гвинея' } },
  { iso3: 'GNB', name: { es: 'Guinea-Bisáu', en: 'Guinea-Bissau', fr: 'Guinée-Bissau', ru: 'Гвинея-Бисау' } },
  { iso3: 'GUY', name: { es: 'Guyana', en: 'Guyana', fr: 'Guyane', ru: 'Гайана' } },
  { iso3: 'HTI', name: { es: 'Haití', en: 'Haiti', fr: 'Haïti', ru: 'Гаити' } },
  { iso3: 'HND', name: { es: 'Honduras', en: 'Honduras', fr: 'Honduras', ru: 'Гондурас' } },
  { iso3: 'HUN', name: { es: 'Hungría', en: 'Hungary', fr: 'Hongrie', ru: 'Венгрия' } },
  { iso3: 'ISL', name: { es: 'Islandia', en: 'Iceland', fr: 'Islande', ru: 'Исландия' } },
  { iso3: 'IND', name: { es: 'India', en: 'India', fr: 'Inde', ru: 'Индия' } },
  { iso3: 'IDN', name: { es: 'Indonesia', en: 'Indonesia', fr: 'Indonésie', ru: 'Индонезия' } },
  { iso3: 'IRN', name: { es: 'Irán', en: 'Iran', fr: 'Iran', ru: 'Иран' } },
  { iso3: 'IRQ', name: { es: 'Irak', en: 'Iraq', fr: 'Irak', ru: 'Ирак' } },
  { iso3: 'IRL', name: { es: 'Irlanda', en: 'Ireland', fr: 'Irlande', ru: 'Ирландия' } },
  { iso3: 'IMN', name: { es: 'Isla de Man', en: 'Isle of Man', fr: 'Île de Man', ru: 'Остров Мэн' } },
  { iso3: 'ISR', name: { es: 'Israel', en: 'Israel', fr: 'Israël', ru: 'Израиль' } },
  { iso3: 'ITA', name: { es: 'Italia', en: 'Italy', fr: 'Italie', ru: 'Италия' } },
  { iso3: 'JAM', name: { es: 'Jamaica', en: 'Jamaica', fr: 'Jamaïque', ru: 'Ямайка' } },
  { iso3: 'JPN', name: { es: 'Japón', en: 'Japan', fr: 'Japon', ru: 'Япония' } },
  { iso3: 'JEY', name: { es: 'Jersey', en: 'Jersey', fr: 'Jersey', ru: 'Джерси' } },
  { iso3: 'JOR', name: { es: 'Jordania', en: 'Jordan', fr: 'Jordanie', ru: 'Иордания' } },
  { iso3: 'KAZ', name: { es: 'Kazajistán', en: 'Kazakhstan', fr: 'Kazakhstan', ru: 'Казахстан' } },
  { iso3: 'KEN', name: { es: 'Kenia', en: 'Kenya', fr: 'Kenya', ru: 'Кения' } },
  { iso3: 'KIR', name: { es: 'Kiribati', en: 'Kiribati', fr: 'Kiribati', ru: 'Кирибати' } },
  { iso3: 'PRK', name: { es: 'Corea del Norte', en: 'North Korea', fr: 'Corée du Nord', ru: 'Корейская Народно-Демократическая Республика' } },
  { iso3: 'KOR', name: { es: 'Corea del Sur', en: 'South Korea', fr: 'Corée du Sud', ru: 'Республика Корея' } },
  { iso3: 'KWT', name: { es: 'Kuwait', en: 'Kuwait', fr: 'Koweït', ru: 'Кувейт' } },
  { iso3: 'KGZ', name: { es: 'Kirguistán', en: 'Kyrgyzstan', fr: 'Kirghizistan', ru: 'Кыргызстан' } },
  { iso3: 'LAO', name: { es: 'Laos', en: 'Laos', fr: 'Laos', ru: 'Лаос' } },
  { iso3: 'LVA', name: { es: 'Letonia', en: 'Latvia', fr: 'Lettonie', ru: 'Латвия' } },
  { iso3: 'LBN', name: { es: 'Líbano', en: 'Lebanon', fr: 'Liban', ru: 'Ливан' } },
  { iso3: 'LSO', name: { es: 'Lesoto', en: 'Lesotho', fr: 'Lesotho', ru: 'Лесото' } },
  { iso3: 'LBR', name: { es: 'Liberia', en: 'Liberia', fr: 'Libéria', ru: 'Либерия' } },
  { iso3: 'LBY', name: { es: 'Libia', en: 'Libya', fr: 'Libye', ru: 'Ливия' } },
  { iso3: 'LIE', name: { es: 'Liechtenstein', en: 'Liechtenstein', fr: 'Liechtenstein', ru: 'Лихтенштейн' } },
  { iso3: 'LTU', name: { es: 'Lituania', en: 'Lithuania', fr: 'Lituanie', ru: 'Литва' } },
  { iso3: 'LUX', name: { es: 'Luxemburgo', en: 'Luxembourg', fr: 'Luxembourg', ru: 'Люксембург' } },
  { iso3: 'MKD', name: { es: 'Macedonia del Norte', en: 'North Macedonia', fr: 'Macédoine du Nord', ru: 'Северная Македония' } },
  { iso3: 'MDG', name: { es: 'Madagascar', en: 'Madagascar', fr: 'Madagascar', ru: 'Мадагаскар' } },
  { iso3: 'MWI', name: { es: 'Malaui', en: 'Malawi', fr: 'Malawi', ru: 'Малави' } },
  { iso3: 'MYS', name: { es: 'Malasia', en: 'Malaysia', fr: 'Malaisie', ru: 'Малайзия' } },
  { iso3: 'MDV', name: { es: 'Maldivas', en: 'Maldives', fr: 'Maldives', ru: 'Мальдивы' } },
  { iso3: 'MLI', name: { es: 'Mali', en: 'Mali', fr: 'Mali', ru: 'Мали' } },
  { iso3: 'MLT', name: { es: 'Malta', en: 'Malta', fr: 'Malte', ru: 'Мальта' } },
  { iso3: 'MHL', name: { es: 'Islas Marshall', en: 'Marshall Islands', fr: 'Îles Marshall', ru: 'Маршалловы острова' } },
  { iso3: 'MTQ', name: { es: 'Martinica', en: 'Martinique', fr: 'Martinique', ru: 'Мартиника' } },
  { iso3: 'MRT', name: { es: 'Mauritania', en: 'Mauritania', fr: 'Mauritanie', ru: 'Мавритания' } },
  { iso3: 'MUS', name: { es: 'Mauricio', en: 'Mauritius', fr: 'Maurice', ru: 'Маврикий' } },
  { iso3: 'MYT', name: { es: 'Mayotte', en: 'Mayotte', fr: 'Mayotte', ru: 'Майотта' } },
  { iso3: 'MEX', name: { es: 'México', en: 'Mexico', fr: 'Mexique', ru: 'Мексика' } },
  { iso3: 'FSM', name: { es: 'Micronesia', en: 'Micronesia', fr: 'Micronésie', ru: 'Микронезия' } },
  { iso3: 'MDA', name: { es: 'Moldavia', en: 'Moldova', fr: 'Moldavie', ru: 'Молдова' } },
  { iso3: 'MCO', name: { es: 'Mónaco', en: 'Monaco', fr: 'Monaco', ru: 'Монако' } },
  { iso3: 'MNG', name: { es: 'Mongolia', en: 'Mongolia', fr: 'Mongolie', ru: 'Монголия' } },
  { iso3: 'MNE', name: { es: 'Montenegro', en: 'Montenegro', fr: 'Monténégro', ru: 'Черногория' } },
  { iso3: 'MSR', name: { es: 'Montserrat', en: 'Montserrat', fr: 'Montserrat', ru: 'Монтсеррат' } },
  { iso3: 'MAR', name: { es: 'Marruecos', en: 'Morocco', fr: 'Maroc', ru: 'Марокко' } },
  { iso3: 'MOZ', name: { es: 'Mozambique', en: 'Mozambique', fr: 'Mozambique', ru: 'Мозамбик' } },
  { iso3: 'MMR', name: { es: 'Myanmar', en: 'Myanmar', fr: 'Myanmar', ru: 'Мьянма' } },
  { iso3: 'NAM', name: { es: 'Namibia', en: 'Namibia', fr: 'Namibie', ru: 'Намибия' } },
  { iso3: 'NRU', name: { es: 'Nauru', en: 'Nauru', fr: 'Nauru', ru: 'Науру' } },
  { iso3: 'NPL', name: { es: 'Nepal', en: 'Nepal', fr: 'Népal', ru: 'Непал' } },
  { iso3: 'NLD', name: { es: 'Países Bajos', en: 'Netherlands', fr: 'Pays-Bas', ru: 'Нидерланды' } },
  { iso3: 'NCL', name: { es: 'Nueva Caledonia', en: 'New Caledonia', fr: 'Nouvelle-Calédonie', ru: 'Новая Каледония' } },
  { iso3: 'NZL', name: { es: 'Nueva Zelanda', en: 'New Zealand', fr: 'Nouvelle-Zélande', ru: 'Новая Зеландия' } },
  { iso3: 'NIC', name: { es: 'Nicaragua', en: 'Nicaragua', fr: 'Nicaragua', ru: 'Никарагуа' } },
  { iso3: 'NER', name: { es: 'Níger', en: 'Niger', fr: 'Niger', ru: 'Нигер' } },
  { iso3: 'NGA', name: { es: 'Nigeria', en: 'Nigeria', fr: 'Nigeria', ru: 'Нигерия' } },
  { iso3: 'NIU', name: { es: 'Niue', en: 'Niue', fr: 'Niue', ru: 'Ниуэ' } },
  { iso3: 'NFK', name: { es: 'Isla Norfolk', en: 'Norfolk Island', fr: 'Île Norfolk', ru: 'Остров Норфолк' } },
  { iso3: 'MNP', name: { es: 'Islas Marianas del Norte', en: 'Northern Mariana Islands', fr: 'Îles Mariannes du Nord', ru: 'Северные Марианские острова' } },
  { iso3: 'NOR', name: { es: 'Noruega', en: 'Norway', fr: 'Norvège', ru: 'Норвегия' } },
  { iso3: 'OMN', name: { es: 'Omán', en: 'Oman', fr: 'Oman', ru: 'Оман' } },
  { iso3: 'PAK', name: { es: 'Pakistán', en: 'Pakistan', fr: 'Pakistan', ru: 'Пакистан' } },
  { iso3: 'PLW', name: { es: 'Palau', en: 'Palau', fr: 'Palau', ru: 'Палау' } },
  { iso3: 'PSE', name: { es: 'Palestina', en: 'Palestine', fr: 'Palestine', ru: 'Палестина' } },
  { iso3: 'PAN', name: { es: 'Panamá', en: 'Panama', fr: 'Panama', ru: 'Панама' } },
  { iso3: 'PNG', name: { es: 'Papúa Nueva Guinea', en: 'Papua New Guinea', fr: 'Papouasie-Nouvelle-Guinée', ru: 'Папуа-Новая Гвинея' } },
  { iso3: 'PRY', name: { es: 'Paraguay', en: 'Paraguay', fr: 'Paraguay', ru: 'Парагвай' } },
  { iso3: 'PER', name: { es: 'Perú', en: 'Peru', fr: 'Pérou', ru: 'Перу' } },
  { iso3: 'PHL', name: { es: 'Filipinas', en: 'Philippines', fr: 'Philippines', ru: 'Филиппины' } },
  { iso3: 'PCN', name: { es: 'Islas Pitcairn', en: 'Pitcairn Islands', fr: 'Îles Pitcairn', ru: 'Острова Питкэрн' } },
  { iso3: 'POL', name: { es: 'Polonia', en: 'Poland', fr: 'Pologne', ru: 'Польша' } },
  { iso3: 'PRT', name: { es: 'Portugal', en: 'Portugal', fr: 'Portugal', ru: 'Португалия' } },
  { iso3: 'PRI', name: { es: 'Puerto Rico', en: 'Puerto Rico', fr: 'Porto Rico', ru: 'Пуэрто-Рико' } },
  { iso3: 'QAT', name: { es: 'Catar', en: 'Qatar', fr: 'Qatar', ru: 'Катар' } },
  { iso3: 'REU', name: { es: 'Reunión', en: 'Réunion', fr: 'La Réunion', ru: 'Реюньон' } },
  { iso3: 'ROU', name: { es: 'Rumanía', en: 'Romania', fr: 'Roumanie', ru: 'Румыния' } },
  { iso3: 'RUS', name: { es: 'Rusia', en: 'Russian Federation', fr: 'Fédération de Russie', ru: 'Россия' } },
  { iso3: 'RWA', name: { es: 'Ruanda', en: 'Rwanda', fr: 'Rwanda', ru: 'Руанда' } },
  { iso3: 'BLM', name: { es: 'San Bartolomé', en: 'Saint Barthélemy', fr: 'Saint-Barthélemy', ru: 'Сен-Бартелеми' } },
  { iso3: 'SHN', name: { es: 'Santa Elena', en: 'Saint Helena', fr: 'Sainte-Hélène', ru: 'Остров Святой Елены' } },
  { iso3: 'KNA', name: { es: 'San Cristóbal y Nieves', en: 'Saint Kitts and Nevis', fr: 'Saint-Kitts-et-Nevis', ru: 'Сент-Китс и Невис' } },
  { iso3: 'LCA', name: { es: 'Santa Lucía', en: 'Saint Lucia', fr: 'Sainte-Lucie', ru: 'Сент-Люсия' } },
  { iso3: 'MAF', name: { es: 'San Martín', en: 'Saint Martin', fr: 'Saint-Martin', ru: 'Сен-Мартен' } },
  { iso3: 'SPM', name: { es: 'San Pedro y Miquelón', en: 'Saint Pierre and Miquelon', fr: 'Saint-Pierre-et-Miquelon', ru: 'Сен-Пьер и Микелон' } },
  { iso3: 'VCT', name: { es: 'San Vicente y las Granadinas', en: 'Saint Vincent and the Grenadines', fr: 'Saint-Vincent-et-les-Grenadines', ru: 'Сент-Винсент и Гренадины' } },
  { iso3: 'WSM', name: { es: 'Samoa', en: 'Samoa', fr: 'Samoa', ru: 'Самоа' } },
  { iso3: 'SMR', name: { es: 'San Marino', en: 'San Marino', fr: 'Saint-Marin', ru: 'Сан-Марино' } },
  { iso3: 'STP', name: { es: 'Santo Tomé y Príncipe', en: 'São Tomé and Príncipe', fr: 'Sao Tomé-et-Principe', ru: 'Сан-Томе и Принсипи' } },
  { iso3: 'SAU', name: { es: 'Arabia Saudita', en: 'Saudi Arabia', fr: 'Arabie saoudite', ru: 'Саудовская Аравия' } },
  { iso3: 'SEN', name: { es: 'Senegal', en: 'Senegal', fr: 'Sénégal', ru: 'Сенегал' } },
  { iso3: 'SRB', name: { es: 'Serbia', en: 'Serbia', fr: 'Serbie', ru: 'Сербия' } },
  { iso3: 'SYC', name: { es: 'Seychelles', en: 'Seychelles', fr: 'Seychelles', ru: 'Сейшелы' } },
  { iso3: 'SLE', name: { es: 'Sierra Leona', en: 'Sierra Leone', fr: 'Sierra Leone', ru: 'Сьерра-Леоне' } },
  { iso3: 'SGP', name: { es: 'Singapur', en: 'Singapore', fr: 'Singapour', ru: 'Сингапур' } },
  { iso3: 'SXM', name: { es: 'Sint Maarten', en: 'Sint Maarten', fr: 'Sint Maarten', ru: 'Синт-Мартен' } },
  { iso3: 'SVK', name: { es: 'Eslovaquia', en: 'Slovakia', fr: 'Slovaquie', ru: 'Словакия' } },
  { iso3: 'SVN', name: { es: 'Eslovenia', en: 'Slovenia', fr: 'Slovénie', ru: 'Словения' } },
  { iso3: 'SLB', name: { es: 'Islas Salomón', en: 'Solomon Islands', fr: 'Îles Salomon', ru: 'Соломоновы острова' } },
  { iso3: 'SOM', name: { es: 'Somalia', en: 'Somalia', fr: 'Somalie', ru: 'Сомали' } },
  { iso3: 'ZAF', name: { es: 'Sudáfrica', en: 'South Africa', fr: 'Afrique du Sud', ru: 'Южно-Африканская Республика' } },
  { iso3: 'SGS', name: { es: 'Georgia del Sur e Islas Sandwich del Sur', en: 'South Georgia and the South Sandwich Islands', fr: 'Géorgie du Sud-et-les Îles Sandwich du Sud', ru: 'Южная Георгия и Южные Сандвичевы острова' } },
  { iso3: 'SSD', name: { es: 'Sudán del Sur', en: 'South Sudan', fr: 'Soudan du Sud', ru: 'Южный Судан' } },
  { iso3: 'ESP', name: { es: 'España', en: 'Spain', fr: 'Espagne', ru: 'Испания' } },
  { iso3: 'LKA', name: { es: 'Sri Lanka', en: 'Sri Lanka', fr: 'Sri Lanka', ru: 'Шри-Ланка' } },
  { iso3: 'SDN', name: { es: 'Sudán', en: 'Sudan', fr: 'Soudan', ru: 'Судан' } },
  { iso3: 'SUR', name: { es: 'Surinam', en: 'Suriname', fr: 'Suriname', ru: 'Суринам' } },
  { iso3: 'SJM', name: { es: 'Svalbard y Jan Mayen', en: 'Svalbard and Jan Mayen', fr: 'Svalbard et Jan Mayen', ru: 'Шпицберген и Ян-Майен' } },
  { iso3: 'SWZ', name: { es: 'Eswatini', en: 'Eswatini', fr: 'Eswatini', ru: 'Эсватини' } },
  { iso3: 'SWE', name: { es: 'Suecia', en: 'Sweden', fr: 'Suède', ru: 'Швеция' } },
  { iso3: 'CHE', name: { es: 'Suiza', en: 'Switzerland', fr: 'Suisse', ru: 'Швейцария' } },
  { iso3: 'SYR', name: { es: 'Siria', en: 'Syria', fr: 'Syrie', ru: 'Сирия' } },
  { iso3: 'TJK', name: { es: 'Tayikistán', en: 'Tajikistan', fr: 'Tadjikistan', ru: 'Таджикистан' } },
  { iso3: 'TZA', name: { es: 'Tanzania', en: 'Tanzania', fr: 'Tanzanie', ru: 'Танзания' } },
  { iso3: 'THA', name: { es: 'Tailandia', en: 'Thailand', fr: 'Thaïlande', ru: 'Таиланд' } },
  { iso3: 'TLS', name: { es: 'Timor Oriental', en: 'Timor-Leste', fr: 'Timor oriental', ru: 'Восточный Тимор' } },
  { iso3: 'TGO', name: { es: 'Togo', en: 'Togo', fr: 'Togo', ru: 'Того' } },
  { iso3: 'TKL', name: { es: 'Tokelau', en: 'Tokelau', fr: 'Tokelau', ru: 'Токелау' } },
  { iso3: 'TON', name: { es: 'Tonga', en: 'Tonga', fr: 'Tonga', ru: 'Тонга' } },
  { iso3: 'TTO', name: { es: 'Trinidad y Tobago', en: 'Trinidad and Tobago', fr: 'Trinité-et-Tobago', ru: 'Тринидад и Тобаго' } },
  { iso3: 'TUN', name: { es: 'Túnez', en: 'Tunisia', fr: 'Tunisie', ru: 'Тунис' } },
  { iso3: 'TUR', name: { es: 'Turquía', en: 'Turkey', fr: 'Turquie', ru: 'Турция' } },
  { iso3: 'TKM', name: { es: 'Turkmenistán', en: 'Turkmenistan', fr: 'Turkménistan', ru: 'Туркменистан' } },
  { iso3: 'TCA', name: { es: 'Islas Turcas y Caicos', en: 'Turks and Caicos Islands', fr: 'Îles Turques-et-Caïques', ru: 'Острова Теркс и Кайкос' } },
  { iso3: 'TUV', name: { es: 'Tuvalu', en: 'Tuvalu', fr: 'Tuvalu', ru: 'Тувалу' } },
  { iso3: 'UGA', name: { es: 'Uganda', en: 'Uganda', fr: 'Ouganda', ru: 'Уганда' } },
  { iso3: 'UKR', name: { es: 'Ucrania', en: 'Ukraine', fr: 'Ukraine', ru: 'Украина' } },
  { iso3: 'ARE', name: { es: 'Emiratos Árabes Unidos', en: 'United Arab Emirates', fr: 'Émirats arabes unis', ru: 'Объединённые Арабские Эмираты' } },
  { iso3: 'GBR', name: { es: 'Reino Unido', en: 'United Kingdom', fr: 'Royaume-Uni', ru: 'Соединённое Королевство' } },
  { iso3: 'USA', name: { es: 'Estados Unidos', en: 'United States', fr: 'États-Unis', ru: 'Соединённые Штаты Америки' } },
  { iso3: 'UMI', name: { es: 'Islas Menores Alejadas de los Estados Unidos', en: 'United States Minor Outlying Islands', fr: 'Îles mineures éloignées des États-Unis', ru: 'Малые отдалённые острова Соединённых Штатов' } },
  { iso3: 'VIR', name: { es: 'Islas Vírgenes de los Estados Unidos', en: 'United States Virgin Islands', fr: 'Îles Vierges des États-Unis', ru: 'Виргинские острова Соединённых Штатов' } },
  { iso3: 'URY', name: { es: 'Uruguay', en: 'Uruguay', fr: 'Uruguay', ru: 'Уругвай' } },
  { iso3: 'UZB', name: { es: 'Uzbekistán', en: 'Uzbekistan', fr: 'Ouzbékistan', ru: 'Узбекистан' } },
  { iso3: 'VUT', name: { es: 'Vanuatu', en: 'Vanuatu', fr: 'Vanuatu', ru: 'Вануату' } },
  { iso3: 'VEN', name: { es: 'Venezuela', en: 'Venezuela', fr: 'Venezuela', ru: 'Венесуэла' } },
  { iso3: 'VNM', name: { es: 'Vietnam', en: 'Vietnam', fr: 'Vietnam', ru: 'Вьетнам' } },
  { iso3: 'WLF', name: { es: 'Wallis y Futuna', en: 'Wallis and Futuna', fr: 'Wallis-et-Futuna', ru: 'Уоллис и Футуна' } },
  { iso3: 'ESH', name: { es: 'Sáhara Occidental', en: 'Western Sahara', fr: 'Sahara occidental', ru: 'Западная Сахара' } },
  { iso3: 'YEM', name: { es: 'Yemen', en: 'Yemen', fr: 'Yémen', ru: 'Йемен' } },
  { iso3: 'ZMB', name: { es: 'Zambia', en: 'Zambia', fr: 'Zambie', ru: 'Замбия' } },
  { iso3: 'ZWE', name: { es: 'Zimbabue', en: 'Zimbabwe', fr: 'Zimbabwe', ru: 'Зимбабве' } }
];

export default function CountrySelect({
  value = '',
  onChange = () => {},
  placeholder = 'Seleccione país',
  required = false,
  className = '',
  name = '',
  language = 'es'
}: CountrySelectProps) {
  const [countries, setCountries] = useState<Array<{iso3: string, name: string}>>([]);

  useEffect(() => {
    console.log('🌍 CountrySelect: Iniciando carga para idioma:', language);
    
    // Procesar países con el idioma seleccionado
    const processedCountries = ALL_COUNTRIES
      .map(country => ({
        iso3: country.iso3,
        name: country.name[language as keyof typeof country.name] || country.name.es
      }))
      .sort((a, b) => a.name.localeCompare(b.name, language === 'ru' ? 'ru' : 'es'));

    console.log('✅ CountrySelect: Países procesados:', processedCountries.length);
    setCountries(processedCountries);
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log('🔄 País seleccionado:', e.target.value);
    onChange(e.target.value);
  };

  console.log('🎨 CountrySelect renderizando:', {
    countriesCount: countries.length,
    value,
    name,
    language,
    placeholder
  });

  return (
    <div className="relative">
      <select
        name={name}
        value={value || ''}
        onChange={handleChange}
        required={required}
        className={className}
        style={{ 
          width: '100%',
          padding: '12px 16px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '16px',
          backgroundColor: 'white',
          color: '#374151'
        }}
      >
        <option value="">{placeholder}</option>
        {countries.map((country) => (
          <option key={country.iso3} value={country.iso3}>
            {country.name}
          </option>
        ))}
      </select>
      <div className="text-xs text-gray-500 mt-1">
        {countries.length} países disponibles
      </div>
    </div>
  );
}

// Componente para nacionalidad
export function NationalitySelect(props: Omit<CountrySelectProps, 'placeholder'>) {
  return (
    <CountrySelect
      {...props}
      placeholder="Seleccione nacionalidad"
    />
  );
}