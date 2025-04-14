workers = 2
bind = "0.0.0.0:10000"
timeout = 300
worker_class = "gevent"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 50