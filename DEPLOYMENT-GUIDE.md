# Deployment Guide for toolkit.pillowpotion.com

This guide will help you deploy the PillowPotion Toolkit to your subdomain.

## Quick Deployment Steps

### Step 1: DNS Configuration

Add a DNS record for your subdomain:

```
Type: A Record or CNAME
Name: toolkit
Value: [Your server IP] or [Your host]
TTL: Auto or 3600
```

### Step 2: Upload Files

Upload the entire `pillowpotion-hub` folder to your web server:

**Via FTP/SFTP:**
```
Upload to: /public_html/toolkit/
or: /var/www/toolkit.pillowpotion.com/
```

**Via cPanel File Manager:**
1. Navigate to File Manager
2. Go to public_html or your web root
3. Create folder: `toolkit`
4. Upload all files maintaining the structure

**Via Command Line (SSH):**
```bash
# Navigate to web root
cd /var/www/

# Create directory
mkdir toolkit.pillowpotion.com

# Upload files (using rsync or scp)
rsync -avz pillowpotion-hub/ user@server:/var/www/toolkit.pillowpotion.com/
```

### Step 3: File Structure on Server

Ensure this structure on your server:

```
/toolkit.pillowpotion.com/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── images/
├── assets/
├── README.md
├── SITE-INFO.txt
└── DEPLOYMENT-GUIDE.md
```

### Step 4: Configure Web Server

**For Apache (.htaccess):**

Create a `.htaccess` file in the root:

```apache
# Enable GZIP Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Browser Caching
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType text/javascript "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Remove .html extension
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^([^\.]+)$ $1.html [NC,L]
```

**For Nginx:**

Add to your nginx configuration:

```nginx
server {
    listen 80;
    server_name toolkit.pillowpotion.com;

    # Force HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name toolkit.pillowpotion.com;

    root /var/www/toolkit.pillowpotion.com;
    index index.html;

    # SSL Configuration (use your certificates)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # GZIP Compression
    gzip on;
    gzip_types text/css text/javascript application/javascript;
    gzip_min_length 1000;

    # Caching
    location ~* \.(css|js|jpg|jpeg|png|webp|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Main location
    location / {
        try_files $uri $uri/ =404;
    }
}
```

### Step 5: SSL Certificate

**Option 1: Let's Encrypt (Free)**
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-apache

# Get certificate
sudo certbot --apache -d toolkit.pillowpotion.com

# Auto-renewal is set up automatically
```

**Option 2: cPanel AutoSSL**
1. Go to cPanel > SSL/TLS Status
2. Find toolkit.pillowpotion.com
3. Click "Run AutoSSL"

**Option 3: Cloudflare (Free)**
1. Add your domain to Cloudflare
2. Enable "Flexible SSL" or "Full SSL"
3. Automatic HTTPS enabled

### Step 6: Testing

After deployment, test these:

- [ ] Visit https://toolkit.pillowpotion.com
- [ ] Check mobile responsiveness
- [ ] Test all tool links
- [ ] Verify FAQ accordion works
- [ ] Test smooth scrolling
- [ ] Check mobile menu
- [ ] Verify all animations work
- [ ] Test on different browsers

### Step 7: Performance Optimization

**Minify Files (Optional but Recommended):**

```bash
# Install minifiers
npm install -g clean-css-cli uglify-js html-minifier

# Minify CSS
cleancss -o css/styles.min.css css/styles.css

# Minify JS
uglifyjs js/main.js -o js/main.min.js

# Minify HTML
html-minifier --collapse-whitespace --remove-comments index.html -o index.min.html
```

Then update index.html to use minified files:
```html
<link rel="stylesheet" href="css/styles.min.css">
<script src="js/main.min.js"></script>
```

## Quick Hosting Solutions

### Netlify (Easiest)
1. Create account at netlify.com
2. Drag and drop the `pillowpotion-hub` folder
3. Configure custom domain: toolkit.pillowpotion.com
4. Automatic HTTPS enabled

### Vercel
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to folder: `cd pillowpotion-hub`
3. Deploy: `vercel`
4. Add custom domain in dashboard

### GitHub Pages + Cloudflare
1. Create GitHub repo
2. Upload files
3. Enable GitHub Pages
4. Point Cloudflare DNS to GitHub Pages
5. Enable HTTPS in Cloudflare

### Traditional Hosting (cPanel, etc.)
1. Use File Manager or FTP
2. Upload to subdomain folder
3. Configure SSL via cPanel
4. Done!

## Post-Deployment Checklist

- [ ] Domain resolves correctly
- [ ] HTTPS is enabled and working
- [ ] All links work (especially tool links)
- [ ] Mobile version displays correctly
- [ ] Page loads in under 3 seconds
- [ ] All animations are smooth
- [ ] Logo image loads correctly
- [ ] FAQ accordion functions properly
- [ ] No console errors
- [ ] All sections are visible

## Monitoring

**Add Analytics (Optional):**

Add Google Analytics to track visitors. Insert before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Troubleshooting

**Issue: Domain not resolving**
- Wait 24-48 hours for DNS propagation
- Check DNS records are correct
- Try clearing DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

**Issue: CSS not loading**
- Check file paths are relative, not absolute
- Verify files uploaded correctly
- Check browser console for 404 errors

**Issue: HTTPS not working**
- Verify SSL certificate is installed
- Check certificate covers subdomain
- Force HTTPS with .htaccess or nginx config

**Issue: Page loads slowly**
- Enable GZIP compression
- Minify CSS and JS
- Use a CDN (Cloudflare)
- Optimize images

## Need Help?

- Check server error logs
- Verify file permissions (644 for files, 755 for directories)
- Test in incognito mode to rule out caching issues
- Check browser console for JavaScript errors

---

**Congratulations!** 🎉

Your PillowPotion Toolkit is now live at `toolkit.pillowpotion.com`!

Share it with the world and start helping creators with free, powerful tools.
