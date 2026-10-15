-- Yearly prices, confirmed by Edem on 15 October 2026: Pro £59.99 a year and
-- Black £129.99 a year. Black's yearly price was already set; this fills in
-- Pro's and records that both are agreed.
update public.plans set yearly_pence = 5999 where tier = 'pro';
update public.plans set yearly_pence = 12999 where tier = 'black';

comment on column public.plans.yearly_pence is
  'Yearly price in pence. Pro £59.99 and Black £129.99, both confirmed by Edem on 15 October 2026.';
