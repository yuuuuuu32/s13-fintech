#!/bin/bash
cd /home/ubuntu/S13P11D108/back-end/mafia
echo "Stopping existing application..."
pkill -f "java.*mafia.*jar" || true
sleep 5
echo "Starting new application..."
nohup java -jar build/libs/mafia-0.0.1-SNAPSHOT.jar > app.log 2>&1 &
APP_PID=$!
echo $APP_PID > app.pid
sleep 5
if ps -p $APP_PID > /dev/null; then
    echo "Application started successfully with PID: $APP_PID"
else
    echo "Failed to start application"
    exit 1
fi
