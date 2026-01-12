-- Enable realtime for notifications table so users get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;