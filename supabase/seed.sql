-- DEMO data mirroring src/config/catalog.ts. Replace with the real catalog.
insert into professionals (id, name, sort) values ('rafael', 'Rafael', 1), ('bruno', 'Bruno', 2), ('diego', 'Diego', 3);

insert into services (id, name, duration_min, price_cents, includes) values
  ('corte-assinatura', 'Corte assinatura', 45, 7000, '{}'),
  ('fade', 'Fade de precisão', 50, 7500, '{}'),
  ('classico', 'Clássico na tesoura', 45, 7000, '{}'),
  ('barba-ritual', 'Barba ritual', 35, 5500, '{}'),
  ('corte-barba', 'Corte + barba ritual', 80, 11500, '{corte-assinatura,barba-ritual}'),
  ('sobrancelha', 'Sobrancelha na navalha', 10, 2000, '{}'),
  ('hidratacao', 'Hidratação capilar', 15, 3000, '{}');

insert into professional_services (professional_id, service_id)
select 'rafael', id from services
union all select 'bruno', unnest(array['corte-assinatura', 'classico', 'fade', 'corte-barba', 'barba-ritual', 'hidratacao'])
union all select 'diego', unnest(array['barba-ritual', 'corte-barba', 'corte-assinatura', 'sobrancelha', 'hidratacao']);

insert into working_hours (professional_id, weekday, starts, ends) values
  ('rafael', 1, '13:00', '20:00'),
  ('rafael', 2, '09:00', '12:00'), ('rafael', 2, '13:00', '20:00'),
  ('rafael', 3, '09:00', '12:00'), ('rafael', 3, '13:00', '20:00'),
  ('rafael', 4, '09:00', '12:00'), ('rafael', 4, '13:00', '20:00'),
  ('rafael', 5, '09:00', '12:00'), ('rafael', 5, '13:00', '20:00'),
  ('rafael', 6, '09:00', '18:00'),
  ('bruno', 2, '09:00', '12:00'), ('bruno', 2, '13:00', '20:00'),
  ('bruno', 3, '09:00', '12:00'), ('bruno', 3, '13:00', '20:00'),
  ('bruno', 4, '09:00', '12:00'), ('bruno', 4, '13:00', '21:00'),
  ('bruno', 5, '09:00', '12:00'), ('bruno', 5, '13:00', '21:00'),
  ('bruno', 6, '09:00', '18:00'),
  ('diego', 1, '13:00', '20:00'),
  ('diego', 3, '09:00', '12:00'), ('diego', 3, '13:00', '20:00'),
  ('diego', 4, '09:00', '12:00'), ('diego', 4, '13:00', '20:00'),
  ('diego', 5, '09:00', '12:00'), ('diego', 5, '13:00', '20:00'),
  ('diego', 6, '09:00', '18:00');

insert into closed_dates (day, reason) values ('2026-12-25', 'Natal'), ('2027-01-01', 'Ano-novo');
