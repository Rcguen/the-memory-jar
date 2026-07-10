-- Remove anon access to email enumeration RPC
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_email_by_username(text) FROM public;
