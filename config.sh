#!/bin/sh
sed -i '/\/var\/log\/mail/d' /etc/rsyslog.d/50-default.conf
