CREATE TABLE public.citizens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL UNIQUE,
  credits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text NOT NULL UNIQUE,
  user_id uuid REFERENCES public.citizens(id) ON DELETE SET NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  severity integer NOT NULL DEFAULT 3,
  ai_reason text,
  department text,
  priority_score integer NOT NULL DEFAULT 0,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  address text,
  photo_url text,
  status text NOT NULL DEFAULT 'Reported',
  duplicate_count integer NOT NULL DEFAULT 0,
  parent_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.credit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.citizens(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.reports(id) ON DELETE SET NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.citizens, public.reports, public.status_history, public.credit_log TO service_role;
ALTER TABLE public.citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_log ENABLE ROW LEVEL SECURITY;

INSERT INTO public.citizens (id,name,phone,credits) VALUES
('11111111-1111-1111-1111-111111111111','Priya Deshmukh','9822000001',165),
('22222222-2222-2222-2222-222222222222','Rahul Wankhede','9822000002',80),
('33333333-3333-3333-3333-333333333333','Sneha Kulkarni','9822000003',35),
('44444444-4444-4444-4444-444444444444','Amit Bhoyar','9822000004',15);

INSERT INTO public.reports (tracking_id,user_id,description,category,severity,ai_reason,department,priority_score,latitude,longitude,address,status,duplicate_count,created_at) VALUES
('CIV-1001','11111111-1111-1111-1111-111111111111','Huge pothole near Sitabuldi main road, bikes are falling','pothole',5,'Deep pothole on busy road causing accidents','Roads',72,21.1458,79.0882,'Sitabuldi, Nagpur','In Progress',3,now()-interval '3 days'),
('CIV-1002','22222222-2222-2222-2222-222222222222','Streetlight not working for a week near Dharampeth','streetlight',3,'Dark street reduces night safety','Electricity',38,21.1390,79.0700,'Dharampeth, Nagpur','Assigned',1,now()-interval '2 days'),
('CIV-1003','33333333-3333-3333-3333-333333333333','कचरा 3 दिन से नहीं उठाया, बदबू आ रही है','garbage',4,'Uncollected garbage creating health hazard','Sanitation',46,21.1520,79.0950,'Itwari, Nagpur','Verified',0,now()-interval '3 days'),
('CIV-1004','11111111-1111-1111-1111-111111111111','Road broken near Medical Square, many potholes','pothole',4,'Multiple potholes on arterial road','Roads',50,21.1300,79.0950,'Medical Square, Nagpur','Resolved',2,now()-interval '6 days'),
('CIV-1005','44444444-4444-4444-4444-444444444444','रस्त्यावर मोठा खड्डा आहे, पाणी साचले','pothole',4,'Water-filled pothole hides depth','Roads',42,21.1600,79.0800,'Sadar, Nagpur','Reported',0,now()-interval '1 day'),
('CIV-1006','22222222-2222-2222-2222-222222222222','Garbage dumped near school gate at Civil Lines','garbage',5,'Garbage near school is a child health risk','Sanitation',57,21.1550,79.0700,'Civil Lines, Nagpur','In Progress',1,now()-interval '1 day'),
('CIV-1007','33333333-3333-3333-3333-333333333333','Streetlight pole flickering and sparking','streetlight',5,'Sparking wire is electrocution risk','Electricity',50,21.1250,79.0800,'Pratap Nagar, Nagpur','Verified',0,now()),
('CIV-1008','44444444-4444-4444-4444-444444444444','Overflowing dustbin at Ambazari garden','garbage',3,'Overflowing bin attracts stray animals','Sanitation',34,21.1350,79.0450,'Ambazari, Nagpur','Reported',0,now()-interval '2 days'),
('CIV-1009','11111111-1111-1111-1111-111111111111','Small crack on footpath near Ramdaspeth','other',2,'Minor footpath damage','Roads',22,21.1330,79.0780,'Ramdaspeth, Nagpur','Resolved',0,now()-interval '1 day'),
('CIV-1010','22222222-2222-2222-2222-222222222222','Fake complaint test','other',1,'No real issue described','Roads',10,21.1480,79.1000,'Gandhibagh, Nagpur','Rejected',0,now()),
('CIV-1011','33333333-3333-3333-3333-333333333333','बत्ती बंद है पूरी गली अंधेरे में','streetlight',4,'Entire lane dark at night','Electricity',44,21.1650,79.1050,'Kamptee Road, Nagpur','Assigned',0,now()-interval '2 days'),
('CIV-1012','44444444-4444-4444-4444-444444444444','Pothole near Wardha road flyover','pothole',4,'Pothole on high-speed road','Roads',40,21.1100,79.0700,'Wardha Road, Nagpur','Reported',0,now());

INSERT INTO public.status_history (report_id,status,note,changed_at)
SELECT id,'Reported','Report received',created_at FROM public.reports;
INSERT INTO public.status_history (report_id,status,note,changed_at)
SELECT id,status,'Updated by authority',created_at + interval '6 hours' FROM public.reports WHERE status <> 'Reported';