# Chip Eight
A web based CHIP-8 interpreter with disassembly tool.

[Link to the website.](https://jamesscn.github.io/chipeight/)

<img src="favicon.png" alt="logo" width=270/>

**New:**
I have added a new tool that lets you disassemble ROMs and display them in assembly code. It can be found in the tools folder and is written in C++ with an example disassembly of the tetris game. I am planning on making a compiler in the future so that custom ROMs can be programmed.

**Features:**
* Can load custom ROMs from a specified URL
* Customizable colours
* Custom keybindings
* Game descriptions and controls
* Functional sound timer

**What makes this interpreter different from the rest?**

From what I have seen, most CHIP-8 interpreters run the instructions too fast to be played and require you to install a client. With the help of Javascript the run time should practically be the same on all machines and platforms.

Another thing to note is that the website doesn't rely on any frameworks or external scripts apart from the colour picker used to set the interpreters colours, so the page shouldn't take long to load.

I tried to comment the code as best I could, so I hope that if you decide to take a look at it you can understand it clearly.
