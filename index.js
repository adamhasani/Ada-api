{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": [
          "api-page/**",
          "src/**"
        ]
      }
    }
  ],
  "routes": [
    {
      "src": "/style.css",
      "dest": "/api-page/style.css"
    },
    {
      "src": "/script.js",
      "dest": "/api-page/script.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
