module.exports = {
  apps: [
    {
      name: 'vg-epaper-handle',
      cwd: '/var/www/VGEpaper/handle',
      script: '.output/server/index.mjs',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production',
        PORT: 3872,
        HOST: '0.0.0.0'
      },

      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
}