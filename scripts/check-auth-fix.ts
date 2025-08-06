// Quick test to verify auth is working for template purchases
console.log(`
🔍 To test the purchase flow:

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to purchase the free template
4. Look for the /api/templates/1/purchase request
5. Check the request headers - should have:
   Authorization: Bearer [your-token]
   
6. Check the response:
   - 401 = Auth not working
   - 404 = Template not found
   - 200 = Success!
   
The auth fix should now:
- Allow GET requests to view templates without auth
- Require auth for POST /api/templates/:id/purchase
- Properly set req.user from the JWT token
`);