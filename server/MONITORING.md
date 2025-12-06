# DevOrbit Monitoring & Observability Guide

This document explains how to monitor and troubleshoot DevOrbit using the integrated observability stack.

## 📊 Services Overview

| Service | Purpose | Dashboard |
|---------|---------|-----------||
| **Upstash Redis** | Serverless caching | [console.upstash.com](https://console.upstash.com) |
| **PostHog** | Product analytics | [app.posthog.com](https://app.posthog.com) |

---

## 🔴 Upstash Redis (Caching)

### Dashboard Access
1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your Redis database
3. View the **Data Browser** for cached keys

### Key Metrics to Monitor
- **Commands/sec**: Normal range is 10-100 for typical usage
- **Memory Usage**: Should stay under 80% of quota
- **Hit Rate**: Target >70% for effective caching
- **Latency**: Should be <10ms for reads

### Cache Key Patterns
DevOrbit uses the following cache key patterns:
```
skills:{userId}       - User's skills list (TTL: 300s)
projects:{userId}     - User's projects list (TTL: 300s)
resources:{userId}    - User's resources list (TTL: 300s)
stats:{userId}        - User's dashboard stats (TTL: 300s)
progress:{userId}     - User's progress data (TTL: 300s)
```

### Test Cache Locally
```bash
# Check cache health
curl http://localhost:3001/api/v1/cache-health

# Expected response:
# {"success":true,"data":{"status":"connected","test":"passed","type":"upstash"}}
```

### Troubleshooting

#### "Cache not configured" error
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check that values don't have extra spaces or quotes

#### High cache miss rate
- Check if data is being invalidated too frequently
- Consider increasing TTL values for stable data

#### Memory issues
- Use Upstash dashboard to identify large keys
- Consider reducing TTL or caching less data

---

## 📈 PostHog (Product Analytics)

### Dashboard Access
1. Go to [app.posthog.com](https://app.posthog.com)
2. Select your DevOrbit project
3. Navigate to **Insights** or **Events**

### Tracked Events

#### Skill Events
| Event | Properties |
|-------|------------|
| `skill_created` | `category`, `status` |
| `skill_updated` | `field`, `changed` |
| `skill_deleted` | `category` |
| `skill_status_changed` | `from`, `to` |
| `skill_linked_to_project` | - |

#### Project Events
| Event | Properties |
|-------|------------|
| `project_created` | `status` |
| `project_updated` | `field` |
| `project_deleted` | - |
| `project_status_changed` | `from`, `to` |

#### Resource Events
| Event | Properties |
|-------|------------|
| `resource_created` | `type` |
| `resource_deleted` | - |
| `resource_opened` | `type` |

#### Auth Events
| Event | Properties |
|-------|------------|
| `user_signed_up` | `method` |
| `user_signed_in` | `method` |
| `user_signed_out` | - |

### Privacy Settings
PostHog is configured with privacy in mind:
- `autocapture: false` - No automatic DOM event capture
- `disable_session_recording: true` - No session recordings
- `respect_dnt: true` - Honors Do Not Track
- No PII collection (emails, names, IPs are stripped)

### Test Analytics Locally
Analytics events are logged to console in development:
```
[Analytics] skill_created { category: 'language', status: 'learning' }
```

Events are only sent to PostHog in production mode.

### Troubleshooting

#### Events not appearing in PostHog
1. Check `VITE_POSTHOG_KEY` is set
2. Verify you're in production mode (`import.meta.env.PROD`)
3. Check browser console for initialization message
4. Events may take 1-2 minutes to appear in dashboard

#### User identification issues
- Users are identified only by UID (no PII)
- Check `identifyUser()` is called after login

---

## 🏥 Health Check Endpoint

### Endpoint: `GET /api/v1/health`

Returns detailed health status of all services.

#### Example Response
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "environment": "production",
  "uptime": {
    "seconds": 3600,
    "formatted": "1h 0m 0s"
  },
  "memory": {
    "rss": 128,
    "heapUsed": 64,
    "heapTotal": 96
  },
  "services": {
    "firestore": "connected",
    "redis": "connected"
  },
  "checks": [
    { "service": "firestore", "status": "pass" },
    { "service": "redis", "status": "pass", "type": "upstash" }
  ]
}
```

#### Status Codes
- `200` - Healthy or degraded (Redis down is degraded, not unhealthy)
- `503` - Unhealthy (Firestore is down)

---

## 🔧 Environment Variables

### Backend (`server/.env`)
```env
# Required for Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxx

# Optional: Fallback to ioredis
REDIS_URL=redis://localhost:6379
```

### Frontend (`client/.env`)
```env
# Required for PostHog
VITE_PUBLIC_POSTHOG_KEY=phc_xxxxx
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

---

## 🚨 Common Issues & Solutions

### 1. "Redis connection failed" on startup
**Cause**: Upstash credentials not set or invalid
**Solution**: 
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- Verify the database exists in Upstash console

### 2. No analytics data in PostHog
**Cause**: Running in development mode
**Solution**:
- Events only send in production
- Check `VITE_PUBLIC_POSTHOG_KEY` is set
- Build with `npm run build` and test with `npm run preview`

### 3. Cache not reducing Firestore reads
**Cause**: Cache invalidation happening too often
**Solution**:
- Check cache TTL values
- Monitor which keys are being invalidated
- Consider longer TTL for stable data

---

## 📞 Support

For issues with monitoring services:
- **Upstash**: [upstash.com/docs](https://upstash.com/docs)
- **PostHog**: [posthog.com/docs](https://posthog.com/docs)
