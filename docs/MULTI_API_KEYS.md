# Multi-API Key Configuration Guide

This guide helps you set up multiple YouTube API keys for load balancing and improved quota management.

## Quick Setup

1. **Copy the environment template:**
   ```bash
   cp .env1 .env
   ```

2. **Configure your API keys in `.env`:**
   ```bash
   # Replace with your actual YouTube API keys
   YOUTUBE_API_KEY_1="AIzaSyC7ks-GptBlJCo6Zknnvrs1Cb2xzQb5B0g"
   YOUTUBE_API_KEY_2="AIzaSyBlI9KIsSGkIN8VrrxOhPOpaIClTOgJOdE"
   YOUTUBE_API_KEY_3="AIzaSyBbWOKAN8_DmBSzU7_76Acs5fBIGtbYvSs"
   # Add more keys as needed...
   ```

3. **Enable load balancing:**
   ```bash
   YOUTUBE_API_ROTATION_ENABLED=true
   ENABLE_API_LOAD_BALANCING=true
   ```

## Available Scripts

### Check Configuration
```bash
npm run apikeys:check
```
Verifies which API keys are configured and active.

### Test API Keys
```bash
npm run apikeys:test
```
Tests the functionality of configured API keys.

### Check Quota Usage
```bash
npm run apikeys:quota
```
Shows current quota usage across all API keys.

### Monitor in Real-time
```bash
npm run apikeys:monitor
```
Starts real-time monitoring of API key usage.

### Get Recommendations
```bash
npm run apikeys:recommend
```
Provides recommendations for optimizing your API key setup.

### Run All Checks
```bash
npm run apikeys:all
```
Runs configuration check, testing, and quota analysis.

### Reset Quotas (Testing)
```bash
npm run apikeys:reset
```
Resets quota counters for all keys (useful for testing).

## Web-based Monitoring

Access quota information via HTTP endpoints:

### Get Multi-Key Quota Status
```bash
curl http://localhost:3000/api/youtube/quota-multikey | jq
```

### Reset Quotas via API
```bash
curl -X POST http://localhost:3000/api/youtube/quota-multikey \
  -H "Content-Type: application/json" \
  -d '{"action": "reset"}'
```

### Clear Cache via API
```bash
curl -X POST http://localhost:3000/api/youtube/quota-multikey \
  -H "Content-Type: application/json" \
  -d '{"action": "clear-cache"}'
```

## Configuration Options

### Load Balancing Settings
```bash
# Enable round-robin rotation of API keys
YOUTUBE_API_ROTATION_ENABLED=true

# Enable intelligent load balancing
ENABLE_API_LOAD_BALANCING=true

# Maximum quota per API key (default: 10000)
YOUTUBE_API_QUOTA_PER_KEY=10000

# Maximum requests per minute per key (default: 100)
YOUTUBE_API_RATE_LIMIT_PER_KEY=100
```

### Failover Settings
```bash
# Enable automatic failover when keys fail
ENABLE_API_FAILOVER=true

# Number of retries before marking key as failed
API_FAILURE_RETRY_COUNT=3

# Cooldown period for failed keys (minutes)
API_FAILURE_COOLDOWN_MINUTES=5
```

### Monitoring Settings
```bash
# Enable detailed API monitoring
ENABLE_API_MONITORING=true

# Log API key rotation activities
LOG_API_KEY_ROTATION=true

# Monitor quota usage across all keys
MONITOR_QUOTA_USAGE=true
```

### Debug Settings
```bash
# Enable debug logging for API calls
DEBUG_API_CALLS=false

# Enable debug logging for quota usage
DEBUG_QUOTA_USAGE=false

# Enable debug logging for rate limiting
DEBUG_RATE_LIMITING=false
```

## Best Practices

### 1. API Key Management
- Use different API keys for different environments (dev, staging, prod)
- Keep API keys secure and never commit them to version control
- Rotate API keys regularly for security
- Monitor usage across all keys to prevent quota exhaustion

### 2. Load Balancing
- Use at least 3-5 API keys for optimal load distribution
- Enable rotation for even distribution of requests
- Monitor individual key performance and disable problematic keys

### 3. Monitoring
- Set up alerts for high quota usage (>80%)
- Monitor key failure rates and investigate issues
- Use real-time monitoring during high-traffic periods
- Keep backup keys ready for emergency failover

### 4. Optimization
- Cache frequently accessed data to reduce API calls
- Use database fallbacks when quota is exhausted
- Implement intelligent request batching
- Optimize search queries to reduce quota usage

## Troubleshooting

### No API Keys Configured
If you see "No YouTube API keys configured!", check:
1. `.env` file exists and has correct key names
2. API keys are valid and not placeholder values
3. Environment variables are loaded correctly

### High Quota Usage
If quota usage is high:
1. Add more API keys to distribute load
2. Implement better caching strategies
3. Optimize API requests to use fewer quota units
4. Consider using database fallbacks more aggressively

### API Key Failures
If keys are failing:
1. Verify API keys are valid and active
2. Check Google Cloud Console for any restrictions
3. Ensure billing is set up correctly
4. Monitor for rate limiting issues

### Performance Issues
If API responses are slow:
1. Check network connectivity
2. Verify caching is working correctly
3. Monitor database performance
4. Consider geographic distribution of API keys

## Migration from Single Key

To migrate from single API key setup:

1. **Keep existing setup working:**
   ```bash
   # Keep your existing key as a fallback
   YOUTUBE_API_KEY="your_existing_key"
   ```

2. **Add new keys gradually:**
   ```bash
   YOUTUBE_API_KEY_1="your_existing_key"
   YOUTUBE_API_KEY_2="your_new_key_2"
   YOUTUBE_API_KEY_3="your_new_key_3"
   ```

3. **Enable rotation:**
   ```bash
   YOUTUBE_API_ROTATION_ENABLED=true
   ```

4. **Test the setup:**
   ```bash
   npm run apikeys:all
   ```

5. **Monitor performance:**
   ```bash
   npm run apikeys:monitor
   ```

## Support

For issues or questions:
1. Check the console logs for detailed error messages
2. Run `npm run apikeys:recommend` for specific suggestions
3. Monitor quota usage with `npm run apikeys:quota`
4. Use debug mode for detailed troubleshooting
