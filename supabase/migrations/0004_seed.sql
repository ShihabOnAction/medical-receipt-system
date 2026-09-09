-- =====================================================================
-- 0004_seed.sql
-- Hospital settings + the investigation catalogue printed on the pad.
-- Prices live here, never in the frontend.
-- =====================================================================

insert into public.settings (id) values (1)
on conflict (id) do nothing;

insert into public.tests (name, short_code, category, price, display_order) values
  ('Digital EEG',                                                  'EEG',        'EEG',      1200,  10),

  ('EMG - Left Upper Limb',                                        'EMG-LUL',    'EMG',      1000,  20),
  ('EMG - Right Upper Limb',                                       'EMG-RUL',    'EMG',      1000,  30),
  ('EMG - Left Lower Limb',                                        'EMG-LLL',    'EMG',      1000,  40),
  ('EMG - Right Lower Limb',                                       'EMG-RLL',    'EMG',      1000,  50),

  ('NCS - Left Upper Limb',                                        'NCS-LUL',    'NCS',      1000,  60),
  ('NCS - Right Upper Limb',                                       'NCS-RUL',    'NCS',      1000,  70),
  ('NCS - Left Lower Limb',                                        'NCS-LLL',    'NCS',      1000,  80),
  ('NCS - Right Lower Limb',                                       'NCS-RLL',    'NCS',      1000,  90),

  ('NCS of Both Upper Limbs',                                      'NCS-BUL',    'NCS',      1500, 100),
  ('NCS of Both Lower Limbs',                                      'NCS-BLL',    'NCS',      1500, 110),
  ('EMG of Both Upper Limbs',                                      'EMG-BUL',    'EMG',      2000, 120),
  ('EMG of Both Lower Limbs',                                      'EMG-BLL',    'EMG',      2000, 130),

  ('NCS of All 4 Limbs',                                           'NCS-4L',     'NCS',      2500, 140),
  ('EMG of All 4 Limbs',                                           'EMG-4L',     'EMG',      2500, 150),

  ('EMG & NCS of Both Upper Limbs',                                'EN-BUL',     'EMG_NCS',  2500, 160),
  ('EMG & NCS of Both Lower Limbs',                                'EN-BLL',     'EMG_NCS',  2500, 170),
  ('EMG & NCS of All 4 Limbs',                                     'EN-4L',      'EMG_NCS',  5000, 180),

  ('NCS of Facial Nerves',                                         'NCS-FACE',   'NCS',      1000, 190),
  ('EMG of Facial Muscles',                                        'EMG-FACE',   'EMG',      1500, 200),

  ('NCS of Brachial Plexus (One Side)',                            'NCS-BP1',    'NCS',      1500, 210),
  ('NCS of Brachial Plexus (Both Side)',                           'NCS-BP2',    'NCS',      2500, 220),
  ('NCS & EMG of Brachial Plexus (One Side)',                      'EN-BP1',     'EMG_NCS',  2000, 230),
  ('NCS & EMG of Brachial Plexus (Both Side)',                     'EN-BP2',     'EMG_NCS',  3000, 240),

  ('NCS of One Upper & One Lower Limb',                            'NCS-1U1L',   'NCS',      1500, 250),
  ('EMG of One Upper & One Lower Limb',                            'EMG-1U1L',   'EMG',      1500, 260),
  ('EMG & NCS of One Upper & One Lower Limb',                      'EN-1U1L',    'EMG_NCS',  2500, 270),

  ('Carotid Duplex Study',                                         'CDS',        'DOPPLER',  1200, 280),
  ('Transcranial Doppler / Transcranial Color Coded Duplex Study', 'TCD',        'DOPPLER',  2500, 290)
on conflict (name) do nothing;
