--
-- PostgreSQL database dump
--

\restrict a25uvXcDuH5fWV5NpoeDsw4n5gWYhPzXdRxBmo1VF7GZhtg9CxRgmHreMDf3S8l

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: gateway_user
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    username character varying NOT NULL,
    hashed_password character varying NOT NULL
);


ALTER TABLE public.admins OWNER TO gateway_user;

--
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: gateway_user
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.admins_id_seq OWNER TO gateway_user;

--
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: gateway_user
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- Name: gateway_configs; Type: TABLE; Schema: public; Owner: gateway_user
--

CREATE TABLE public.gateway_configs (
    id character varying NOT NULL,
    name character varying NOT NULL,
    is_active boolean NOT NULL,
    sort_order integer NOT NULL,
    config_data json NOT NULL,
    credentials_schema jsonb DEFAULT '[]'::jsonb NOT NULL
);


ALTER TABLE public.gateway_configs OWNER TO gateway_user;

--
-- Name: transactions; Type: TABLE; Schema: public; Owner: gateway_user
--

CREATE TABLE public.transactions (
    id character varying NOT NULL,
    reference_id character varying NOT NULL,
    amount double precision NOT NULL,
    description character varying,
    redirect_url character varying,
    gateway_id character varying NOT NULL,
    status character varying NOT NULL,
    error_message character varying,
    qr_string character varying,
    payment_url character varying,
    created_at timestamp without time zone NOT NULL,
    utr character varying
);


ALTER TABLE public.transactions OWNER TO gateway_user;

--
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: gateway_user
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: gateway_user
--

COPY public.admins (id, username, hashed_password) FROM stdin;
1	admin	240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
\.


--
-- Data for Name: gateway_configs; Type: TABLE DATA; Schema: public; Owner: gateway_user
--

COPY public.gateway_configs (id, name, is_active, sort_order, config_data, credentials_schema) FROM stdin;
lgpay	LGPay	f	0	{"app_id": "YD5094", "key": "uWqMeuvOwTo15FduVGoRULqx8KIFv0lQ", "trade_type": "INRUPI", "exchange_rate": "1", "notify_url": ""}	[{"name": "app_id", "type": "text", "label": "App ID (Merchant Login)", "placeholder": "e.g. YD5094"}, {"name": "key", "type": "password", "label": "Merchant Key (MD5 Secret)", "placeholder": "32+ character merchant secret"}, {"name": "trade_type", "type": "text", "label": "Trade Type", "placeholder": "INRUPI  |  Nagad  |  bKash"}, {"name": "exchange_rate", "type": "text", "label": "Exchange Rate (INR → BDT)", "placeholder": "1 for INRUPI/direct INR; 1.4 for BDT auto"}]
okpay	OkPay	f	0	{"mch_id": "1000", "key": "eb6080dbc8dc429ab86a1cd1c337975d", "host": "https://sandbox.wpay.one", "notify_url": ""}	[{"name": "mch_id", "type": "text", "label": "Merchant ID", "placeholder": "e.g. 1000"}, {"name": "key", "type": "password", "label": "MD5 Secret Key", "placeholder": "32-character MD5 secret"}, {"name": "host", "type": "url", "label": "API Host URL", "placeholder": "https://sandbox.wpay.one"}, {"name": "notify_url", "type": "url", "label": "Webhook Notification URL", "placeholder": "https://your-domain.com/api/webhooks/okpay"}]
jazpays	JazPays	t	0	{"merchant_id": "100222036", "api_key": "741d5341913113809157917fa9c12044", "notify_url": "http://localhost:5173/webhooks/jazpays"}	[{"name": "merchant_id", "type": "text", "label": "Merchant ID", "placeholder": "Your JazPays merchant ID"}, {"name": "api_key", "type": "password", "label": "API Key", "placeholder": "Your JazPays secret API Key"}, {"name": "notify_url", "type": "url", "label": "Webhook callback URL", "placeholder": "https://your-domain.com/api/webhooks/jazpays"}]
imb	IMB	f	0	{"api_key": "041c5d3eb80b70cd5cd6ef96c7bcb54b", "host_url": "https://secure-stage.imb.org.in/api/create-order"}	[{"name": "api_key", "type": "password", "label": "API Key (user_token)", "placeholder": "Your IMB secret API token"}, {"name": "host_url", "type": "url", "label": "Host URL", "placeholder": "https://your-imb-host-url.com/create-order"}]
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: gateway_user
--

COPY public.transactions (id, reference_id, amount, description, redirect_url, gateway_id, status, error_message, qr_string, payment_url, created_at, utr) FROM stdin;
TXN40F43FD14973	string	1		http://localhost:8000/	paypal	success	\N	paypal_qr_900AFE81168C	https://www.paypal.com/checkoutnow?token=EC-900AFE81168C	2026-05-20 15:44:47.056595	\N
TXN18487CB3AD84	ref_445222	100	Order Payment #123	https://your-site.com/callback	stripe	success	\N	stripe_qr_0a63ff079e5a	https://checkout.stripe.com/pay/cs_test_0a63ff079e5a	2026-05-20 15:52:38.110828	\N
TXN6164A3EE2930	ref_331539	100	Order Payment #123	https://your-site.com/callback	adyen	success	\N	adyen_qr_37f98726057c	https://test.adyen.link/checkout/37f98726057c	2026-05-20 15:55:24.322278	\N
TXN47CD0B8AB673	ref_912300	100	Order Payment #123	https://your-site.com/callback	adyen	failed	Adyen Error: Refused (101: Blocked card)			2026-05-20 16:31:28.698191	\N
TXN99AB93E19D33	ref_733035	100	Order Payment #123	https://your-site.com/callback	razorpay	success	\N	razorpay_qr_c772ebfb4836	https://api.razorpay.com/v1/checkout/c772ebfb4836	2026-05-20 16:31:34.49857	\N
TXNCB503C9F3264	ref_781319	100	Order Payment #123	https://your-site.com/callback	okpay	success	\N	upi://pay?pa=okpay&tr=763046bcacd4411f8b40cd6f074e0859&am=100&cu=INR	https://sandbox.wpay.one/payment/763046bcacd4411f8b40cd6f074e0859.html	2026-05-20 16:31:39.535541	\N
TXNA09BF8A46D79	ref_804375	100	Order Payment #123	https://your-site.com/callback	okpay	success	\N	upi://pay?pa=okpay&tr=2120286bfc4a4f6d843f60a613a59e84&am=100&cu=INR	https://sandbox.wpay.one/payment/2120286bfc4a4f6d843f60a613a59e84.html	2026-05-20 16:38:59.871271	\N
TXN257148688C74	ref_982078	100	Order Payment #123	https://your-site.com/callback	okpay	pending	\N	upi://pay?pa=okpay&tr=1c08e2f0dde648e8af553c86c9404b36&am=100&cu=INR	https://sandbox.wpay.one/payment/1c08e2f0dde648e8af553c86c9404b36.html	2026-05-20 16:45:14.998047	\N
TXNCC358A9F0B2A	ref_125564	100	Order Payment #123	https://your-site.com/callback	okpay	pending	\N	upi://pay?pa=okpay&tr=4830f5aae5a6450c81e1878cd01e0c8f&am=100&cu=INR	https://sandbox.wpay.one/payment/4830f5aae5a6450c81e1878cd01e0c8f.html	2026-05-20 16:47:34.726054	\N
TXN10C67A9A7410	ref_395590	100	Order Payment #123	https://your-site.com/callback	lgpay	failed	LGPay Error: Sign Error (status=0)			2026-05-20 17:12:16.530983	\N
TXNF4DED548FEF0	ref_575587	100	Order Payment #123	https://your-site.com/callback	lgpay	failed	LGPay Error: Sign Error (status=0)			2026-05-20 17:13:06.906922	\N
TXNA633E1643D62	ref_907198	100	Order Payment #123	https://your-site.com/callback	imb	failed	IMB: api_key is not configured in the database.			2026-05-20 17:15:33.931069	\N
TXN66C57EB296FA	ref_662385	100	Order Payment #123	https://your-site.com/callback	lgpay	failed	LGPay Error: Sign Error (status=0)			2026-05-20 17:15:59.022142	\N
TXN2F01E16CFA4F	ref_test_123	100	Test LGPay Order	http://localhost:5173/success	lgpay	failed	LGPay Error: SUCCESS (status=0)			2026-05-20 17:18:08.821504	\N
TXNEE01D6808BFA	GR-A0E0093673C14857	100	Test LGPay Order	http://localhost:5173/success	lgpay	pending	\N		https://www.lg-pay.com/order/pay/GR-A0E0093673C14857	2026-05-20 17:18:29.628901	\N
TXN63BCB5156C9A	GR-95B2F45252234502	100	Order Payment #123	https://your-site.com/callback	lgpay	pending	\N		https://www.lg-pay.com/order/pay/GR-95B2F45252234502	2026-05-20 17:18:38.47241	\N
TXNB874D6CCA92D	1105693432	100	Order Payment #123	https://your-site.com/callback	imb	pending	\N		https://v2-api.genqr.sbs/8ec58db62cad3c6d9b867ca1cee1829880c3b879eeaab1634717bef17213424a25dcc290	2026-05-20 17:19:50.38921	\N
TXNA574D28EAC0F	ref_test_jaz_1	100	Test JazPays Order	http://localhost:5173/success	jazpays	failed	JazPays Error: Invalid merchant credentials			2026-05-20 17:29:48.105136	\N
TXN8B6A40D62B3A	ORD0D64DB1177A4	100	Order Payment #123	https://your-site.com/callback	jazpays	success	\N		https://pay.payaia.com/payment?orderId=PA260520230053187324	2026-05-20 17:30:53.331845	JAZP2026052000002748
TXNCA1A83E1CED2	ORD7C4585079CB3	100	Order Payment #123	https://your-site.com/callback	jazpays	pending	\N		https://pay.payaia.com/payment?orderId=PA260520230309187914	2026-05-20 17:33:09.211332	\N
TXN590A604BA20B	ORD4637EF01E181	100	Order Payment #123	https://your-site.com/callback	jazpays	pending	\N		https://pay.payaia.com/payment?orderId=PA260520230754189068	2026-05-20 17:37:55.071192	\N
\.


--
-- Name: admins_id_seq; Type: SEQUENCE SET; Schema: public; Owner: gateway_user
--

SELECT pg_catalog.setval('public.admins_id_seq', 1, true);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: gateway_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: gateway_configs gateway_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: gateway_user
--

ALTER TABLE ONLY public.gateway_configs
    ADD CONSTRAINT gateway_configs_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: gateway_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: ix_admins_id; Type: INDEX; Schema: public; Owner: gateway_user
--

CREATE INDEX ix_admins_id ON public.admins USING btree (id);


--
-- Name: ix_admins_username; Type: INDEX; Schema: public; Owner: gateway_user
--

CREATE UNIQUE INDEX ix_admins_username ON public.admins USING btree (username);


--
-- Name: ix_gateway_configs_id; Type: INDEX; Schema: public; Owner: gateway_user
--

CREATE INDEX ix_gateway_configs_id ON public.gateway_configs USING btree (id);


--
-- Name: ix_transactions_id; Type: INDEX; Schema: public; Owner: gateway_user
--

CREATE INDEX ix_transactions_id ON public.transactions USING btree (id);


--
-- PostgreSQL database dump complete
--

\unrestrict a25uvXcDuH5fWV5NpoeDsw4n5gWYhPzXdRxBmo1VF7GZhtg9CxRgmHreMDf3S8l

