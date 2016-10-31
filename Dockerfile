FROM node:7
EXPOSE 8000
MAINTAINER Jean-Christophe Hoelt <hoelt@fovea.cc>
RUN useradd app -d /home/app
WORKDIR /home/app/code
COPY package.json /home/app/code/package.json
RUN chown -R app /home/app
ENV NODE_ENV=production
USER app
RUN npm install --production

COPY index.js config.js /home/app/code/
COPY src /home/app/code/src

USER root
RUN chown -R app /home/app

WORKDIR /home/app/code
USER app
CMD node index.js | bunyan
