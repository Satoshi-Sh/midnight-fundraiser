# Midnight Fundraiser

This application has been made out of [Midnight Tutorial Project](https://github.com/midnightntwrk/example-bboard) and submitted for [Midnight Hackathon Sep 26th - 28th, 2025](https://midnight-hackathon.devpost.com/?_gl=1*nzxf3o*_gcl_au*MzUxMjQwMTE0LjE3NTYxNTY3OTQ.*_ga*MTI4OTMyNjEyNS4xNzU2MTU2Nzk0*_ga_0YHJK3Y10M*czE3NTg5OTkyNzAkbzE3JGcxJHQxNzU5MDAwNzE4JGo2MCRsMCRoMA..) 

Midnight Fundraiser allows users to create fundraising campaigns with their digital wallet. Others can directly contribute—no intermediaries required.

## How to use the CLI

Note: if installing via npm, you need to pass `--legacy-peer-deps` because of the more modern use of vite.

1. Install the node modules in the root
1. Install the node modules in `api`
1. Install the node modules in `contract`, compile the contract with `npm run compact`, and then the typescript with `npm run build`
1. Install the node modules in `bboard-cli`, build it and run `npm run testnet-remote` to launch the app

## How to use the user interface

1. Install the node modules in the root
1. Install the node modules in `api`
1. Install the node modules in `contract` and compile it
1. Install the node modules in `bboard-ui`
1. Run `npm run build:start` to build the project and run a local server
