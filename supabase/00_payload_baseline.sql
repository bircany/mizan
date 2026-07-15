--
-- PostgreSQL database dump
--

\restrict ziCxj9wQR2FDw0oqERigNgcuwEBeerFAH8uwHZDADGMbZnXohotfR4aDqbuwh9p

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _locales; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public._locales AS ENUM (
    'tr',
    'en',
    'ar'
);


--
-- Name: enum_campaigns_currency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_campaigns_currency AS ENUM (
    'TRY',
    'USD',
    'EUR',
    'GBP'
);


--
-- Name: enum_campaigns_reporting_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_campaigns_reporting_mode AS ENUM (
    'pool',
    'donation_based'
);


--
-- Name: enum_donation_intents_currency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_donation_intents_currency AS ENUM (
    'TRY',
    'USD',
    'EUR',
    'GBP'
);


--
-- Name: enum_donation_intents_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_donation_intents_status AS ENUM (
    'draft',
    'payment_initialized',
    'callback_received',
    'completed',
    'failed'
);


--
-- Name: enum_donations_currency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_donations_currency AS ENUM (
    'TRY',
    'USD',
    'EUR',
    'GBP'
);


--
-- Name: enum_donations_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_donations_status AS ENUM (
    'paid',
    'pending_review',
    'failed',
    'cancelled',
    'partially_refunded',
    'refunded'
);


--
-- Name: enum_donor_reports_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_donor_reports_status AS ENUM (
    'draft',
    'approved',
    'sent',
    'stopped'
);


--
-- Name: enum_field_tasks_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_field_tasks_status AS ENUM (
    'todo',
    'in_progress',
    'submitted',
    'approved',
    'needs_revision'
);


--
-- Name: enum_news_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_news_category AS ENUM (
    'haber',
    'etkinlik',
    'duyuru',
    'proje'
);


--
-- Name: enum_proof_assets_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_proof_assets_kind AS ENUM (
    'document',
    'photo',
    'video'
);


--
-- Name: enum_proof_submissions_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_proof_submissions_status AS ENUM (
    'draft',
    'submitted',
    'external_pending',
    'review_pending',
    'approved',
    'rejected'
);


--
-- Name: enum_refund_requests_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_refund_requests_status AS ENUM (
    'pending',
    'completed',
    'failed'
);


--
-- Name: enum_refund_requests_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_refund_requests_type AS ENUM (
    'cancel',
    'refund_full',
    'refund_partial'
);


--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.enum_users_role AS ENUM (
    'super_admin',
    'finance',
    'field_operator',
    'approver'
);


--
-- Name: consume_api_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consume_api_rate_limit(p_key text, p_window_seconds integer, p_max_requests integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  allowed boolean;
begin
  if p_key is null or length(p_key) = 0 or p_window_seconds <= 0 or p_max_requests <= 0 then
    raise exception 'Invalid rate limit input';
  end if;

  insert into public.api_rate_limits (
    rate_limit_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_key, now(), 1, now())
  on conflict (rate_limit_key) do update
  set
    request_count = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.api_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.api_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.api_rate_limits.window_started_at
    end,
    updated_at = now()
  returning request_count <= p_max_requests into allowed;

  return allowed;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_rate_limits (
    rate_limit_key text NOT NULL,
    window_started_at timestamp with time zone DEFAULT now() NOT NULL,
    request_count integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_rate_limits_request_count_check CHECK ((request_count >= 0))
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    action character varying NOT NULL,
    actor_email character varying,
    target_collection character varying,
    target_id character varying,
    details jsonb,
    ip_address character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns (
    id integer NOT NULL,
    target_amount numeric NOT NULL,
    collected_amount numeric DEFAULT 0,
    code character varying NOT NULL,
    image_id integer,
    category_id integer,
    currency public.enum_campaigns_currency DEFAULT 'TRY'::public.enum_campaigns_currency,
    reporting_mode public.enum_campaigns_reporting_mode DEFAULT 'pool'::public.enum_campaigns_reporting_mode,
    is_donation_open boolean DEFAULT true,
    slug character varying NOT NULL,
    donor_count numeric DEFAULT 0,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_id_seq OWNED BY public.campaigns.id;


--
-- Name: campaigns_locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaigns_locales (
    title character varying NOT NULL,
    description jsonb,
    meta_title character varying,
    meta_description character varying,
    meta_image_id integer,
    id integer NOT NULL,
    _locale public._locales NOT NULL,
    _parent_id integer NOT NULL
);


--
-- Name: campaigns_locales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaigns_locales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaigns_locales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaigns_locales_id_seq OWNED BY public.campaigns_locales.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    icon character varying,
    color character varying,
    slug character varying NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: categories_locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories_locales (
    name character varying NOT NULL,
    id integer NOT NULL,
    _locale public._locales NOT NULL,
    _parent_id integer NOT NULL
);


--
-- Name: categories_locales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_locales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_locales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_locales_id_seq OWNED BY public.categories_locales.id;


--
-- Name: donation_intents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donation_intents (
    id integer NOT NULL,
    conversation_id character varying NOT NULL,
    donor_name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    campaign_id integer NOT NULL,
    amount numeric NOT NULL,
    currency public.enum_donation_intents_currency DEFAULT 'TRY'::public.enum_donation_intents_currency NOT NULL,
    status public.enum_donation_intents_status DEFAULT 'draft'::public.enum_donation_intents_status,
    note character varying,
    tax_receipt_requested boolean DEFAULT false,
    kvkk_accepted_at timestamp(3) with time zone,
    terms_accepted_at timestamp(3) with time zone,
    source character varying DEFAULT 'website'::character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: donation_intents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donation_intents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donation_intents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donation_intents_id_seq OWNED BY public.donation_intents.id;


--
-- Name: donations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donations (
    id integer NOT NULL,
    donor_name character varying NOT NULL,
    email character varying NOT NULL,
    phone character varying,
    campaign_id integer NOT NULL,
    gross_amount numeric NOT NULL,
    net_confirmed_amount numeric NOT NULL,
    currency public.enum_donations_currency DEFAULT 'TRY'::public.enum_donations_currency NOT NULL,
    status public.enum_donations_status DEFAULT 'pending_review'::public.enum_donations_status NOT NULL,
    payment_id character varying NOT NULL,
    receipt_number character varying NOT NULL,
    payment_session_id integer NOT NULL,
    tax_receipt_requested boolean DEFAULT false,
    donation_note character varying,
    receipt_path character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: donations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donations_id_seq OWNED BY public.donations.id;


--
-- Name: donor_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_reports (
    id integer NOT NULL,
    title character varying NOT NULL,
    donation_id integer NOT NULL,
    summary_for_donor character varying,
    status public.enum_donor_reports_status DEFAULT 'draft'::public.enum_donor_reports_status,
    approved_by_id integer,
    sent_at timestamp(3) with time zone,
    sent_email_to character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: donor_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donor_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donor_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donor_reports_id_seq OWNED BY public.donor_reports.id;


--
-- Name: donor_reports_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.donor_reports_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    proof_submissions_id integer
);


--
-- Name: donor_reports_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.donor_reports_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: donor_reports_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.donor_reports_rels_id_seq OWNED BY public.donor_reports_rels.id;


--
-- Name: field_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.field_tasks (
    id integer NOT NULL,
    campaign_id integer NOT NULL,
    title character varying NOT NULL,
    location character varying NOT NULL,
    assigned_to_id integer NOT NULL,
    due_at timestamp(3) with time zone,
    status public.enum_field_tasks_status DEFAULT 'todo'::public.enum_field_tasks_status,
    notes character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: field_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.field_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: field_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.field_tasks_id_seq OWNED BY public.field_tasks.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id integer NOT NULL,
    alt character varying NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    url character varying,
    thumbnail_u_r_l character varying,
    filename character varying,
    mime_type character varying,
    filesize numeric,
    width numeric,
    height numeric,
    focal_x numeric,
    focal_y numeric,
    sizes_thumbnail_url character varying,
    sizes_thumbnail_width numeric,
    sizes_thumbnail_height numeric,
    sizes_thumbnail_mime_type character varying,
    sizes_thumbnail_filesize numeric,
    sizes_thumbnail_filename character varying
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: news; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news (
    id integer NOT NULL,
    image_id integer,
    category public.enum_news_category DEFAULT 'haber'::public.enum_news_category,
    published_at timestamp(3) with time zone,
    slug character varying NOT NULL,
    author character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: news_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.news_id_seq OWNED BY public.news.id;


--
-- Name: news_locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.news_locales (
    title character varying NOT NULL,
    content jsonb,
    meta_title character varying,
    meta_description character varying,
    meta_image_id integer,
    id integer NOT NULL,
    _locale public._locales NOT NULL,
    _parent_id integer NOT NULL
);


--
-- Name: news_locales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.news_locales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: news_locales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.news_locales_id_seq OWNED BY public.news_locales.id;


--
-- Name: pages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages (
    id integer NOT NULL,
    slug character varying NOT NULL,
    published boolean DEFAULT true,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: pages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pages_id_seq OWNED BY public.pages.id;


--
-- Name: pages_locales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pages_locales (
    title character varying NOT NULL,
    content jsonb,
    meta_title character varying,
    meta_description character varying,
    meta_image_id integer,
    id integer NOT NULL,
    _locale public._locales NOT NULL,
    _parent_id integer NOT NULL
);


--
-- Name: pages_locales_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pages_locales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pages_locales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pages_locales_id_seq OWNED BY public.pages_locales.id;


--
-- Name: payload_kv; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_kv (
    id integer NOT NULL,
    key character varying NOT NULL,
    data jsonb NOT NULL
);


--
-- Name: payload_kv_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_kv_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_kv_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_kv_id_seq OWNED BY public.payload_kv.id;


--
-- Name: payload_locked_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_locked_documents (
    id integer NOT NULL,
    global_slug character varying,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_locked_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_locked_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_locked_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_locked_documents_id_seq OWNED BY public.payload_locked_documents.id;


--
-- Name: payload_locked_documents_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_locked_documents_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer,
    media_id integer,
    categories_id integer,
    campaigns_id integer,
    news_id integer,
    pages_id integer,
    donation_intents_id integer,
    payment_sessions_id integer,
    payment_events_id integer,
    donations_id integer,
    refund_requests_id integer,
    field_tasks_id integer,
    proof_submissions_id integer,
    proof_assets_id integer,
    donor_reports_id integer,
    audit_logs_id integer
);


--
-- Name: payload_locked_documents_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_locked_documents_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_locked_documents_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_locked_documents_rels_id_seq OWNED BY public.payload_locked_documents_rels.id;


--
-- Name: payload_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_migrations (
    id integer NOT NULL,
    name character varying,
    batch numeric,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_migrations_id_seq OWNED BY public.payload_migrations.id;


--
-- Name: payload_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_preferences (
    id integer NOT NULL,
    key character varying,
    value jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payload_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_preferences_id_seq OWNED BY public.payload_preferences.id;


--
-- Name: payload_preferences_rels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payload_preferences_rels (
    id integer NOT NULL,
    "order" integer,
    parent_id integer NOT NULL,
    path character varying NOT NULL,
    users_id integer
);


--
-- Name: payload_preferences_rels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payload_preferences_rels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payload_preferences_rels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payload_preferences_rels_id_seq OWNED BY public.payload_preferences_rels.id;


--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_events (
    id integer NOT NULL,
    event_type character varying NOT NULL,
    reference_id character varying NOT NULL,
    headers jsonb,
    payload jsonb NOT NULL,
    signature_verified boolean DEFAULT false,
    processed_at timestamp(3) with time zone,
    payment_session_id integer,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_events_id_seq OWNED BY public.payment_events.id;


--
-- Name: payment_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_sessions (
    id integer NOT NULL,
    donation_intent_id integer NOT NULL,
    conversation_id character varying NOT NULL,
    checkout_token character varying,
    checkout_form_content character varying,
    payment_page_url character varying,
    provider_status character varying DEFAULT 'INIT'::character varying,
    fraud_status numeric,
    payment_id character varying,
    last_four_digits character varying,
    card_association character varying,
    raw_response jsonb,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_sessions_id_seq OWNED BY public.payment_sessions.id;


--
-- Name: proof_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proof_assets (
    id integer NOT NULL,
    submission_id integer NOT NULL,
    kind public.enum_proof_assets_kind NOT NULL,
    storage_path character varying NOT NULL,
    file_name character varying NOT NULL,
    mime_type character varying NOT NULL,
    size numeric,
    caption character varying,
    is_donor_visible boolean DEFAULT false,
    uploaded_by_id integer,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: proof_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proof_assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proof_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proof_assets_id_seq OWNED BY public.proof_assets.id;


--
-- Name: proof_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proof_submissions (
    id integer NOT NULL,
    title character varying NOT NULL,
    field_task_id integer NOT NULL,
    donation_id integer,
    campaign_id integer,
    summary character varying,
    external_approval_code character varying,
    external_reference_id character varying,
    review_notes character varying,
    status public.enum_proof_submissions_status DEFAULT 'draft'::public.enum_proof_submissions_status,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: proof_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proof_submissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proof_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proof_submissions_id_seq OWNED BY public.proof_submissions.id;


--
-- Name: refund_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refund_requests (
    id integer NOT NULL,
    donation_id integer NOT NULL,
    type public.enum_refund_requests_type NOT NULL,
    reason character varying NOT NULL,
    description character varying,
    amount numeric,
    provider_reference character varying,
    provider_response jsonb,
    status public.enum_refund_requests_status DEFAULT 'pending'::public.enum_refund_requests_status,
    requested_by_id integer NOT NULL,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL
);


--
-- Name: refund_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.refund_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refund_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.refund_requests_id_seq OWNED BY public.refund_requests.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying NOT NULL,
    role public.enum_users_role DEFAULT 'field_operator'::public.enum_users_role NOT NULL,
    is_active boolean DEFAULT true,
    last_login_at timestamp(3) with time zone,
    updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    created_at timestamp(3) with time zone DEFAULT now() NOT NULL,
    email character varying NOT NULL,
    reset_password_token character varying,
    reset_password_expiration timestamp(3) with time zone,
    salt character varying,
    hash character varying,
    login_attempts numeric DEFAULT 0,
    lock_until timestamp(3) with time zone
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: users_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_sessions (
    _order integer NOT NULL,
    _parent_id integer NOT NULL,
    id character varying NOT NULL,
    created_at timestamp(3) with time zone,
    expires_at timestamp(3) with time zone NOT NULL
);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: campaigns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns ALTER COLUMN id SET DEFAULT nextval('public.campaigns_id_seq'::regclass);


--
-- Name: campaigns_locales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns_locales ALTER COLUMN id SET DEFAULT nextval('public.campaigns_locales_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: categories_locales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories_locales ALTER COLUMN id SET DEFAULT nextval('public.categories_locales_id_seq'::regclass);


--
-- Name: donation_intents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_intents ALTER COLUMN id SET DEFAULT nextval('public.donation_intents_id_seq'::regclass);


--
-- Name: donations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations ALTER COLUMN id SET DEFAULT nextval('public.donations_id_seq'::regclass);


--
-- Name: donor_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports ALTER COLUMN id SET DEFAULT nextval('public.donor_reports_id_seq'::regclass);


--
-- Name: donor_reports_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports_rels ALTER COLUMN id SET DEFAULT nextval('public.donor_reports_rels_id_seq'::regclass);


--
-- Name: field_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_tasks ALTER COLUMN id SET DEFAULT nextval('public.field_tasks_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: news id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news ALTER COLUMN id SET DEFAULT nextval('public.news_id_seq'::regclass);


--
-- Name: news_locales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_locales ALTER COLUMN id SET DEFAULT nextval('public.news_locales_id_seq'::regclass);


--
-- Name: pages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages ALTER COLUMN id SET DEFAULT nextval('public.pages_id_seq'::regclass);


--
-- Name: pages_locales id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_locales ALTER COLUMN id SET DEFAULT nextval('public.pages_locales_id_seq'::regclass);


--
-- Name: payload_kv id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_kv ALTER COLUMN id SET DEFAULT nextval('public.payload_kv_id_seq'::regclass);


--
-- Name: payload_locked_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_id_seq'::regclass);


--
-- Name: payload_locked_documents_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_locked_documents_rels_id_seq'::regclass);


--
-- Name: payload_migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_migrations ALTER COLUMN id SET DEFAULT nextval('public.payload_migrations_id_seq'::regclass);


--
-- Name: payload_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_id_seq'::regclass);


--
-- Name: payload_preferences_rels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels ALTER COLUMN id SET DEFAULT nextval('public.payload_preferences_rels_id_seq'::regclass);


--
-- Name: payment_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events ALTER COLUMN id SET DEFAULT nextval('public.payment_events_id_seq'::regclass);


--
-- Name: payment_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_sessions ALTER COLUMN id SET DEFAULT nextval('public.payment_sessions_id_seq'::regclass);


--
-- Name: proof_assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_assets ALTER COLUMN id SET DEFAULT nextval('public.proof_assets_id_seq'::regclass);


--
-- Name: proof_submissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_submissions ALTER COLUMN id SET DEFAULT nextval('public.proof_submissions_id_seq'::regclass);


--
-- Name: refund_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests ALTER COLUMN id SET DEFAULT nextval('public.refund_requests_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: api_rate_limits api_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_rate_limits
    ADD CONSTRAINT api_rate_limits_pkey PRIMARY KEY (rate_limit_key);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: campaigns_locales campaigns_locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns_locales
    ADD CONSTRAINT campaigns_locales_pkey PRIMARY KEY (id);


--
-- Name: campaigns campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_pkey PRIMARY KEY (id);


--
-- Name: categories_locales categories_locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories_locales
    ADD CONSTRAINT categories_locales_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: donation_intents donation_intents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_intents
    ADD CONSTRAINT donation_intents_pkey PRIMARY KEY (id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: donor_reports donor_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports
    ADD CONSTRAINT donor_reports_pkey PRIMARY KEY (id);


--
-- Name: donor_reports_rels donor_reports_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports_rels
    ADD CONSTRAINT donor_reports_rels_pkey PRIMARY KEY (id);


--
-- Name: field_tasks field_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_tasks
    ADD CONSTRAINT field_tasks_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: news_locales news_locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_locales
    ADD CONSTRAINT news_locales_pkey PRIMARY KEY (id);


--
-- Name: news news_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_pkey PRIMARY KEY (id);


--
-- Name: pages_locales pages_locales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_locales
    ADD CONSTRAINT pages_locales_pkey PRIMARY KEY (id);


--
-- Name: pages pages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages
    ADD CONSTRAINT pages_pkey PRIMARY KEY (id);


--
-- Name: payload_kv payload_kv_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_kv
    ADD CONSTRAINT payload_kv_pkey PRIMARY KEY (id);


--
-- Name: payload_locked_documents payload_locked_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents
    ADD CONSTRAINT payload_locked_documents_pkey PRIMARY KEY (id);


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pkey PRIMARY KEY (id);


--
-- Name: payload_migrations payload_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_migrations
    ADD CONSTRAINT payload_migrations_pkey PRIMARY KEY (id);


--
-- Name: payload_preferences payload_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences
    ADD CONSTRAINT payload_preferences_pkey PRIMARY KEY (id);


--
-- Name: payload_preferences_rels payload_preferences_rels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payment_sessions payment_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_sessions
    ADD CONSTRAINT payment_sessions_pkey PRIMARY KEY (id);


--
-- Name: proof_assets proof_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_assets
    ADD CONSTRAINT proof_assets_pkey PRIMARY KEY (id);


--
-- Name: proof_submissions proof_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_submissions
    ADD CONSTRAINT proof_submissions_pkey PRIMARY KEY (id);


--
-- Name: refund_requests refund_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users_sessions users_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_updated_at_idx ON public.audit_logs USING btree (updated_at);


--
-- Name: campaigns_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_category_idx ON public.campaigns USING btree (category_id);


--
-- Name: campaigns_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campaigns_code_idx ON public.campaigns USING btree (code);


--
-- Name: campaigns_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_created_at_idx ON public.campaigns USING btree (created_at);


--
-- Name: campaigns_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_image_idx ON public.campaigns USING btree (image_id);


--
-- Name: campaigns_locales_locale_parent_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campaigns_locales_locale_parent_id_unique ON public.campaigns_locales USING btree (_locale, _parent_id);


--
-- Name: campaigns_meta_meta_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_meta_meta_image_idx ON public.campaigns_locales USING btree (meta_image_id, _locale);


--
-- Name: campaigns_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX campaigns_slug_idx ON public.campaigns USING btree (slug);


--
-- Name: campaigns_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX campaigns_updated_at_idx ON public.campaigns USING btree (updated_at);


--
-- Name: categories_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_created_at_idx ON public.categories USING btree (created_at);


--
-- Name: categories_locales_locale_parent_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_locales_locale_parent_id_unique ON public.categories_locales USING btree (_locale, _parent_id);


--
-- Name: categories_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_idx ON public.categories USING btree (slug);


--
-- Name: categories_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_updated_at_idx ON public.categories USING btree (updated_at);


--
-- Name: donation_intents_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donation_intents_campaign_idx ON public.donation_intents USING btree (campaign_id);


--
-- Name: donation_intents_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX donation_intents_conversation_id_idx ON public.donation_intents USING btree (conversation_id);


--
-- Name: donation_intents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donation_intents_created_at_idx ON public.donation_intents USING btree (created_at);


--
-- Name: donation_intents_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donation_intents_updated_at_idx ON public.donation_intents USING btree (updated_at);


--
-- Name: donations_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donations_campaign_idx ON public.donations USING btree (campaign_id);


--
-- Name: donations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donations_created_at_idx ON public.donations USING btree (created_at);


--
-- Name: donations_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX donations_payment_id_idx ON public.donations USING btree (payment_id);


--
-- Name: donations_payment_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donations_payment_session_idx ON public.donations USING btree (payment_session_id);


--
-- Name: donations_receipt_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX donations_receipt_number_idx ON public.donations USING btree (receipt_number);


--
-- Name: donations_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donations_updated_at_idx ON public.donations USING btree (updated_at);


--
-- Name: donor_reports_approved_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_approved_by_idx ON public.donor_reports USING btree (approved_by_id);


--
-- Name: donor_reports_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_created_at_idx ON public.donor_reports USING btree (created_at);


--
-- Name: donor_reports_donation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_donation_idx ON public.donor_reports USING btree (donation_id);


--
-- Name: donor_reports_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_rels_order_idx ON public.donor_reports_rels USING btree ("order");


--
-- Name: donor_reports_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_rels_parent_idx ON public.donor_reports_rels USING btree (parent_id);


--
-- Name: donor_reports_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_rels_path_idx ON public.donor_reports_rels USING btree (path);


--
-- Name: donor_reports_rels_proof_submissions_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_rels_proof_submissions_id_idx ON public.donor_reports_rels USING btree (proof_submissions_id);


--
-- Name: donor_reports_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX donor_reports_updated_at_idx ON public.donor_reports USING btree (updated_at);


--
-- Name: field_tasks_assigned_to_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_tasks_assigned_to_idx ON public.field_tasks USING btree (assigned_to_id);


--
-- Name: field_tasks_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_tasks_campaign_idx ON public.field_tasks USING btree (campaign_id);


--
-- Name: field_tasks_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_tasks_created_at_idx ON public.field_tasks USING btree (created_at);


--
-- Name: field_tasks_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX field_tasks_updated_at_idx ON public.field_tasks USING btree (updated_at);


--
-- Name: media_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_created_at_idx ON public.media USING btree (created_at);


--
-- Name: media_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX media_filename_idx ON public.media USING btree (filename);


--
-- Name: media_sizes_thumbnail_sizes_thumbnail_filename_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_sizes_thumbnail_sizes_thumbnail_filename_idx ON public.media USING btree (sizes_thumbnail_filename);


--
-- Name: media_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX media_updated_at_idx ON public.media USING btree (updated_at);


--
-- Name: news_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_created_at_idx ON public.news USING btree (created_at);


--
-- Name: news_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_image_idx ON public.news USING btree (image_id);


--
-- Name: news_locales_locale_parent_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX news_locales_locale_parent_id_unique ON public.news_locales USING btree (_locale, _parent_id);


--
-- Name: news_meta_meta_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_meta_meta_image_idx ON public.news_locales USING btree (meta_image_id, _locale);


--
-- Name: news_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX news_slug_idx ON public.news USING btree (slug);


--
-- Name: news_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX news_updated_at_idx ON public.news USING btree (updated_at);


--
-- Name: pages_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_created_at_idx ON public.pages USING btree (created_at);


--
-- Name: pages_locales_locale_parent_id_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pages_locales_locale_parent_id_unique ON public.pages_locales USING btree (_locale, _parent_id);


--
-- Name: pages_meta_meta_image_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_meta_meta_image_idx ON public.pages_locales USING btree (meta_image_id, _locale);


--
-- Name: pages_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX pages_slug_idx ON public.pages USING btree (slug);


--
-- Name: pages_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX pages_updated_at_idx ON public.pages USING btree (updated_at);


--
-- Name: payload_kv_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payload_kv_key_idx ON public.payload_kv USING btree (key);


--
-- Name: payload_locked_documents_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_created_at_idx ON public.payload_locked_documents USING btree (created_at);


--
-- Name: payload_locked_documents_global_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_global_slug_idx ON public.payload_locked_documents USING btree (global_slug);


--
-- Name: payload_locked_documents_rels_audit_logs_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_audit_logs_id_idx ON public.payload_locked_documents_rels USING btree (audit_logs_id);


--
-- Name: payload_locked_documents_rels_campaigns_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_campaigns_id_idx ON public.payload_locked_documents_rels USING btree (campaigns_id);


--
-- Name: payload_locked_documents_rels_categories_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_categories_id_idx ON public.payload_locked_documents_rels USING btree (categories_id);


--
-- Name: payload_locked_documents_rels_donation_intents_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_donation_intents_id_idx ON public.payload_locked_documents_rels USING btree (donation_intents_id);


--
-- Name: payload_locked_documents_rels_donations_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_donations_id_idx ON public.payload_locked_documents_rels USING btree (donations_id);


--
-- Name: payload_locked_documents_rels_donor_reports_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_donor_reports_id_idx ON public.payload_locked_documents_rels USING btree (donor_reports_id);


--
-- Name: payload_locked_documents_rels_field_tasks_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_field_tasks_id_idx ON public.payload_locked_documents_rels USING btree (field_tasks_id);


--
-- Name: payload_locked_documents_rels_media_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_media_id_idx ON public.payload_locked_documents_rels USING btree (media_id);


--
-- Name: payload_locked_documents_rels_news_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_news_id_idx ON public.payload_locked_documents_rels USING btree (news_id);


--
-- Name: payload_locked_documents_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_order_idx ON public.payload_locked_documents_rels USING btree ("order");


--
-- Name: payload_locked_documents_rels_pages_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_pages_id_idx ON public.payload_locked_documents_rels USING btree (pages_id);


--
-- Name: payload_locked_documents_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_parent_idx ON public.payload_locked_documents_rels USING btree (parent_id);


--
-- Name: payload_locked_documents_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_path_idx ON public.payload_locked_documents_rels USING btree (path);


--
-- Name: payload_locked_documents_rels_payment_events_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_payment_events_id_idx ON public.payload_locked_documents_rels USING btree (payment_events_id);


--
-- Name: payload_locked_documents_rels_payment_sessions_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_payment_sessions_id_idx ON public.payload_locked_documents_rels USING btree (payment_sessions_id);


--
-- Name: payload_locked_documents_rels_proof_assets_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_proof_assets_id_idx ON public.payload_locked_documents_rels USING btree (proof_assets_id);


--
-- Name: payload_locked_documents_rels_proof_submissions_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_proof_submissions_id_idx ON public.payload_locked_documents_rels USING btree (proof_submissions_id);


--
-- Name: payload_locked_documents_rels_refund_requests_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_refund_requests_id_idx ON public.payload_locked_documents_rels USING btree (refund_requests_id);


--
-- Name: payload_locked_documents_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_rels_users_id_idx ON public.payload_locked_documents_rels USING btree (users_id);


--
-- Name: payload_locked_documents_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_locked_documents_updated_at_idx ON public.payload_locked_documents USING btree (updated_at);


--
-- Name: payload_migrations_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_migrations_created_at_idx ON public.payload_migrations USING btree (created_at);


--
-- Name: payload_migrations_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_migrations_updated_at_idx ON public.payload_migrations USING btree (updated_at);


--
-- Name: payload_preferences_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_created_at_idx ON public.payload_preferences USING btree (created_at);


--
-- Name: payload_preferences_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_key_idx ON public.payload_preferences USING btree (key);


--
-- Name: payload_preferences_rels_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_order_idx ON public.payload_preferences_rels USING btree ("order");


--
-- Name: payload_preferences_rels_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_parent_idx ON public.payload_preferences_rels USING btree (parent_id);


--
-- Name: payload_preferences_rels_path_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_path_idx ON public.payload_preferences_rels USING btree (path);


--
-- Name: payload_preferences_rels_users_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_rels_users_id_idx ON public.payload_preferences_rels USING btree (users_id);


--
-- Name: payload_preferences_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payload_preferences_updated_at_idx ON public.payload_preferences USING btree (updated_at);


--
-- Name: payment_events_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_events_created_at_idx ON public.payment_events USING btree (created_at);


--
-- Name: payment_events_payment_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_events_payment_session_idx ON public.payment_events USING btree (payment_session_id);


--
-- Name: payment_events_reference_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_events_reference_id_idx ON public.payment_events USING btree (reference_id);


--
-- Name: payment_events_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_events_updated_at_idx ON public.payment_events USING btree (updated_at);


--
-- Name: payment_sessions_checkout_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_sessions_checkout_token_idx ON public.payment_sessions USING btree (checkout_token);


--
-- Name: payment_sessions_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX payment_sessions_conversation_id_idx ON public.payment_sessions USING btree (conversation_id);


--
-- Name: payment_sessions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_sessions_created_at_idx ON public.payment_sessions USING btree (created_at);


--
-- Name: payment_sessions_donation_intent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_sessions_donation_intent_idx ON public.payment_sessions USING btree (donation_intent_id);


--
-- Name: payment_sessions_payment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_sessions_payment_id_idx ON public.payment_sessions USING btree (payment_id);


--
-- Name: payment_sessions_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payment_sessions_updated_at_idx ON public.payment_sessions USING btree (updated_at);


--
-- Name: proof_assets_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_assets_created_at_idx ON public.proof_assets USING btree (created_at);


--
-- Name: proof_assets_submission_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_assets_submission_idx ON public.proof_assets USING btree (submission_id);


--
-- Name: proof_assets_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_assets_updated_at_idx ON public.proof_assets USING btree (updated_at);


--
-- Name: proof_assets_uploaded_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_assets_uploaded_by_idx ON public.proof_assets USING btree (uploaded_by_id);


--
-- Name: proof_submissions_campaign_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_submissions_campaign_idx ON public.proof_submissions USING btree (campaign_id);


--
-- Name: proof_submissions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_submissions_created_at_idx ON public.proof_submissions USING btree (created_at);


--
-- Name: proof_submissions_donation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_submissions_donation_idx ON public.proof_submissions USING btree (donation_id);


--
-- Name: proof_submissions_field_task_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_submissions_field_task_idx ON public.proof_submissions USING btree (field_task_id);


--
-- Name: proof_submissions_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX proof_submissions_updated_at_idx ON public.proof_submissions USING btree (updated_at);


--
-- Name: refund_requests_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_requests_created_at_idx ON public.refund_requests USING btree (created_at);


--
-- Name: refund_requests_donation_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_requests_donation_idx ON public.refund_requests USING btree (donation_id);


--
-- Name: refund_requests_requested_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_requests_requested_by_idx ON public.refund_requests USING btree (requested_by_id);


--
-- Name: refund_requests_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refund_requests_updated_at_idx ON public.refund_requests USING btree (updated_at);


--
-- Name: users_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_created_at_idx ON public.users USING btree (created_at);


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_sessions_order_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_order_idx ON public.users_sessions USING btree (_order);


--
-- Name: users_sessions_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_sessions_parent_id_idx ON public.users_sessions USING btree (_parent_id);


--
-- Name: users_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_updated_at_idx ON public.users USING btree (updated_at);


--
-- Name: campaigns campaigns_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: campaigns campaigns_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns
    ADD CONSTRAINT campaigns_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: campaigns_locales campaigns_locales_meta_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns_locales
    ADD CONSTRAINT campaigns_locales_meta_image_id_media_id_fk FOREIGN KEY (meta_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: campaigns_locales campaigns_locales_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaigns_locales
    ADD CONSTRAINT campaigns_locales_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: categories_locales categories_locales_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories_locales
    ADD CONSTRAINT categories_locales_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: donation_intents donation_intents_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donation_intents
    ADD CONSTRAINT donation_intents_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: donations donations_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: donations donations_payment_session_id_payment_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_payment_session_id_payment_sessions_id_fk FOREIGN KEY (payment_session_id) REFERENCES public.payment_sessions(id) ON DELETE SET NULL;


--
-- Name: donor_reports donor_reports_approved_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports
    ADD CONSTRAINT donor_reports_approved_by_id_users_id_fk FOREIGN KEY (approved_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: donor_reports donor_reports_donation_id_donations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports
    ADD CONSTRAINT donor_reports_donation_id_donations_id_fk FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE SET NULL;


--
-- Name: donor_reports_rels donor_reports_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports_rels
    ADD CONSTRAINT donor_reports_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.donor_reports(id) ON DELETE CASCADE;


--
-- Name: donor_reports_rels donor_reports_rels_proof_submissions_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.donor_reports_rels
    ADD CONSTRAINT donor_reports_rels_proof_submissions_fk FOREIGN KEY (proof_submissions_id) REFERENCES public.proof_submissions(id) ON DELETE CASCADE;


--
-- Name: field_tasks field_tasks_assigned_to_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_tasks
    ADD CONSTRAINT field_tasks_assigned_to_id_users_id_fk FOREIGN KEY (assigned_to_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: field_tasks field_tasks_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.field_tasks
    ADD CONSTRAINT field_tasks_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: news news_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news
    ADD CONSTRAINT news_image_id_media_id_fk FOREIGN KEY (image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: news_locales news_locales_meta_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_locales
    ADD CONSTRAINT news_locales_meta_image_id_media_id_fk FOREIGN KEY (meta_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: news_locales news_locales_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.news_locales
    ADD CONSTRAINT news_locales_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.news(id) ON DELETE CASCADE;


--
-- Name: pages_locales pages_locales_meta_image_id_media_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_locales
    ADD CONSTRAINT pages_locales_meta_image_id_media_id_fk FOREIGN KEY (meta_image_id) REFERENCES public.media(id) ON DELETE SET NULL;


--
-- Name: pages_locales pages_locales_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pages_locales
    ADD CONSTRAINT pages_locales_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_audit_logs_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_audit_logs_fk FOREIGN KEY (audit_logs_id) REFERENCES public.audit_logs(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_campaigns_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_campaigns_fk FOREIGN KEY (campaigns_id) REFERENCES public.campaigns(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_categories_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_categories_fk FOREIGN KEY (categories_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_donation_intents_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_donation_intents_fk FOREIGN KEY (donation_intents_id) REFERENCES public.donation_intents(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_donations_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_donations_fk FOREIGN KEY (donations_id) REFERENCES public.donations(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_donor_reports_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_donor_reports_fk FOREIGN KEY (donor_reports_id) REFERENCES public.donor_reports(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_field_tasks_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_field_tasks_fk FOREIGN KEY (field_tasks_id) REFERENCES public.field_tasks(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_media_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_media_fk FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_news_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_news_fk FOREIGN KEY (news_id) REFERENCES public.news(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_pages_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_pages_fk FOREIGN KEY (pages_id) REFERENCES public.pages(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_locked_documents(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_payment_events_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_payment_events_fk FOREIGN KEY (payment_events_id) REFERENCES public.payment_events(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_payment_sessions_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_payment_sessions_fk FOREIGN KEY (payment_sessions_id) REFERENCES public.payment_sessions(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_proof_assets_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_proof_assets_fk FOREIGN KEY (proof_assets_id) REFERENCES public.proof_assets(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_proof_submissions_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_proof_submissions_fk FOREIGN KEY (proof_submissions_id) REFERENCES public.proof_submissions(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_refund_requests_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_refund_requests_fk FOREIGN KEY (refund_requests_id) REFERENCES public.refund_requests(id) ON DELETE CASCADE;


--
-- Name: payload_locked_documents_rels payload_locked_documents_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_locked_documents_rels
    ADD CONSTRAINT payload_locked_documents_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payload_preferences_rels payload_preferences_rels_parent_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_parent_fk FOREIGN KEY (parent_id) REFERENCES public.payload_preferences(id) ON DELETE CASCADE;


--
-- Name: payload_preferences_rels payload_preferences_rels_users_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payload_preferences_rels
    ADD CONSTRAINT payload_preferences_rels_users_fk FOREIGN KEY (users_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payment_events payment_events_payment_session_id_payment_sessions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_payment_session_id_payment_sessions_id_fk FOREIGN KEY (payment_session_id) REFERENCES public.payment_sessions(id) ON DELETE SET NULL;


--
-- Name: payment_sessions payment_sessions_donation_intent_id_donation_intents_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_sessions
    ADD CONSTRAINT payment_sessions_donation_intent_id_donation_intents_id_fk FOREIGN KEY (donation_intent_id) REFERENCES public.donation_intents(id) ON DELETE SET NULL;


--
-- Name: proof_assets proof_assets_submission_id_proof_submissions_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_assets
    ADD CONSTRAINT proof_assets_submission_id_proof_submissions_id_fk FOREIGN KEY (submission_id) REFERENCES public.proof_submissions(id) ON DELETE SET NULL;


--
-- Name: proof_assets proof_assets_uploaded_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_assets
    ADD CONSTRAINT proof_assets_uploaded_by_id_users_id_fk FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: proof_submissions proof_submissions_campaign_id_campaigns_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_submissions
    ADD CONSTRAINT proof_submissions_campaign_id_campaigns_id_fk FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL;


--
-- Name: proof_submissions proof_submissions_donation_id_donations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_submissions
    ADD CONSTRAINT proof_submissions_donation_id_donations_id_fk FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE SET NULL;


--
-- Name: proof_submissions proof_submissions_field_task_id_field_tasks_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proof_submissions
    ADD CONSTRAINT proof_submissions_field_task_id_field_tasks_id_fk FOREIGN KEY (field_task_id) REFERENCES public.field_tasks(id) ON DELETE SET NULL;


--
-- Name: refund_requests refund_requests_donation_id_donations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_donation_id_donations_id_fk FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE SET NULL;


--
-- Name: refund_requests refund_requests_requested_by_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refund_requests
    ADD CONSTRAINT refund_requests_requested_by_id_users_id_fk FOREIGN KEY (requested_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: users_sessions users_sessions_parent_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_sessions
    ADD CONSTRAINT users_sessions_parent_id_fk FOREIGN KEY (_parent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: api_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: campaigns_locales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.campaigns_locales ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: categories_locales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories_locales ENABLE ROW LEVEL SECURITY;

--
-- Name: donation_intents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donation_intents ENABLE ROW LEVEL SECURITY;

--
-- Name: donations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: donor_reports_rels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.donor_reports_rels ENABLE ROW LEVEL SECURITY;

--
-- Name: field_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.field_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

--
-- Name: news; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

--
-- Name: news_locales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.news_locales ENABLE ROW LEVEL SECURITY;

--
-- Name: pages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

--
-- Name: pages_locales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pages_locales ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_kv; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_kv ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_locked_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_locked_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_locked_documents_rels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_locked_documents_rels ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_migrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: payload_preferences_rels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payload_preferences_rels ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: proof_assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proof_assets ENABLE ROW LEVEL SECURITY;

--
-- Name: proof_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proof_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: refund_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users_sessions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ziCxj9wQR2FDw0oqERigNgcuwEBeerFAH8uwHZDADGMbZnXohotfR4aDqbuwh9p

