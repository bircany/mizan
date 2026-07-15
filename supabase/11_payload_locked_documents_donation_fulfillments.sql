ALTER TABLE public.payload_locked_documents_rels
  ADD COLUMN IF NOT EXISTS donation_fulfillments_id integer;

CREATE INDEX IF NOT EXISTS payload_locked_documents_rels_donation_fulfillments_id_idx
  ON public.payload_locked_documents_rels USING btree (donation_fulfillments_id);

DO $$
BEGIN
  ALTER TABLE public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_donation_fulfillments_fk
    FOREIGN KEY (donation_fulfillments_id)
    REFERENCES public.donation_fulfillments(id)
    ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
