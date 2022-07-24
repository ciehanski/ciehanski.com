---
title: my code 
subtitle: Checkout my most notable open-source projects. Pull requests and issues are welcome!
description: Checkout my most notable open-source projects. Pull requests and issues are welcome!
featured_image: 
---

### libgen-cli [![](https://img.shields.io/github/stars/ciehanski/libgen-cli?style=social)](https://github.com/ciehanski/libgen-cli)
<mark>libgen-cli</mark> is a CLI tool used to access the Library Genesis dataset; written in Go. I built this tool when I discovered the [Library Gensis](https://en.wikipedia.org/wiki/Library_Genesis) project. I'm a firm believer in the ideals behind the project, but the websites used to acces their dataset are difficult to navigate and download pages are riddled with adware. So, to mitigate this poor user expierence, I created <mark>libgen-cli</mark> (originally forked from [Antoine Chiny](https://github.com/TonyChG/libgen-cli))! You can also download multiple books concurrently (useful for automation) and download the currently available Library Genesis database dumps. Currently <mark>libgen-cli</mark> is being used in various countries around the world, which I think is cool.

### onionbox [![](https://img.shields.io/github/stars/ciehanski/onionbox?style=social)](https://github.com/ciehanski/onionbox)
<mark>onionbox</mark> allows users to send and receive files securely through Tor. It works by embedding a local copy of Tor within the <mark>onionbox</mark> binary where API calls can be made to connect to the Tor network and create a hidden onion service. A simple webpage is then hosted at the root of that hidden onion service's URL where users can upload files and share a uniquely generated URL with their recipients for download. By default, the onion URL presented is randomly generated, but you also have the option to roll your own V3 onion address for the webserver to host the onion service on. <mark>onionbox</mark> can be used on multiple platforms and also has a docker image available.

### oniongen-hs [![](https://img.shields.io/github/stars/ciehanski/oniongen-hs?style=social)](https://github.com/ciehanski/oniongen-hs)
<mark>oniongen-hs</mark> is a vanity URL generator for Tor version 3 .onion addresses, lovingly written in Haskell. It was heavily inspired by the project [oniongen-go](https://github.com/rdkr/oniongen-go) by [rdkr](https://github.com/rdkr). This was an extremely satisfying & fun project with the purpose of teaching myself <mark>Haskell</mark>.

### kip [![](https://img.shields.io/github/stars/ciehanski/kip?style=social)](https://github.com/ciehanski/kip)
<mark>kip</mark> is a vanity URL generator for Tor version 3 .onion addresses, lovingly written in Haskell. It was heavily inspired by the project [oniongen-go](https://github.com/rdkr/oniongen-go) by [rdkr](https://github.com/rdkr). This was an extremely satisfying & fun project with the purpose of teaching myself <mark>Rust</mark>.
