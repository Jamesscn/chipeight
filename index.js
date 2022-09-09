/*
 * Sound function I found on w3schools.net that plays audio in browser
 * I use this to play the beep for the sound timer
 */
function sound(src) {
    this.sound = document.createElement("audio")
    this.sound.src = src
    this.sound.setAttribute("preload", "auto")
    this.sound.setAttribute("controls", "none")
    this.sound.style.display = "none"
    document.body.appendChild(this.sound)
    this.play = function () {
        this.sound.play()
    }
}

/*
 * If you are looking for a detailed description on how the CHIP-8 interpreter works, you should consider reading the following pages:
 * Wikipedia page with implementation details:
 * https://en.wikipedia.org/wiki/CHIP-8 (pay attention to the notes at the bottom of the page, they contain important information!)
 * Cowgod's Technical Reference:
 * http://devernay.free.fr/hacks/chip8/C8TECH10.HTM
 */

/*
 * Variable initialization:
 * Notable variables:
 * beep - The beeping sound that occurs when the sound timer is greater than zero
 * canvas - A 640 x 320 html canvas that displays the games (each game pixel occupies 10 canvas pixels)
 * screen - The canvas' context
 * background - Background colour (can be changed by the user)
 * foreground - Foreground colour (can be changed by the user)
 * keyset - An array of keycodes containing all the keys in the CHIP-8 keyboard (this can also be changed by the user)
 * ---------
 * |1|2|3|4|
 * --------
 * |Q|W|E|R|
 * ---------
 * |A|S|D|F|
 * ---------
 * |Z|X|C|V|
 * ---------
 * pixels - A boolean array of pixels to be displayed on the canvas of size 2048 (64 x 32)
 * keys - A boolean array of the states of 16 keys
 * indexRegister - the index register commonly known as I
 * gameInterval - I store the game loop as a javascript interval in this variable
 * timerInterval - A separate interval running at approximately 60Hz that updates the game timers
 * settingKey - Is true when the user is changing a control to a custom keybinding
 * settingId - ID of the key that is being changed
 * 
 * You may notice I am not using a stack pointer, this is because I decided to remove the size limits on the stack and the memory
 */
var beep = new sound("beep.mp3")
var canvas = document.getElementById("chip")
var screen = canvas.getContext("2d")
var background = "black"
var foreground = "white"
/*
 * Background and foreground preferences are stored in the user's local storage
 * meaning that if a user revisits the page, they will keep the same screen colours
 */
if (localStorage.getItem("background") != null) {
    background = localStorage.getItem("background")
    document.getElementById("background").value = background
}
if (localStorage.getItem("foreground") != null) {
    foreground = localStorage.getItem("foreground")
    document.getElementById("foreground").value = foreground
}
/*
 * Retrieves custom key bindings from the user's local storage
 */
var keyset = [49, 50, 51, 52, 81, 87, 69, 82, 65, 83, 68, 70, 90, 88, 67, 86]
if (localStorage.getItem("keyset") != null) {
    keyset = JSON.parse(localStorage.getItem("keyset")) //Array must be parsed from a string
    for (var i = 0; i < 16; i++) {
        document.getElementById("btn" + i).textContent = String.fromCharCode(keyset[i])
    }
}
var pixels = []
var keys = []
var memory = []
var V = []
var stack = []
var indexRegister = 0
var programCounter = 0x200
var delayTimer = 0
var soundTimer = 0
var gameInterval = null
var timerInterval = null
var gameStarted = false
var settingKey = false
var settingId = "0"
var fontset = [
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80  // F
]

/*
 * Clears the canvas and the pixels array
 */
function clearScreen() {
    screen.clearRect(0, 0, 640, 320)
    screen.fillStyle = background
    screen.fillRect(0, 0, 640, 320)
    for (var i = 0; i < 2048; ++i) {
        pixels[i] = false
    }
}

/*
 * Redraws the pixels onto the canvas
 */
function draw() {
    screen.clearRect(0, 0, 640, 320)
    screen.fillStyle = background
    screen.fillRect(0, 0, 640, 320)
    screen.fillStyle = foreground
    for (var i = 0; i < 64; ++i) {
        for (var j = 0; j < 32; ++j) {
            if (pixels[64 * j + i]) {
                screen.fillRect(i * 10, j * 10, 10, 10)
            }
        }
    }
}

/*
 * Fetches a rom from my github page and loads it into the interpreter, starting the game
 * This is called every time a rom is selected from the game list, so it also reinitializes all of the variables
 */
function loadGame(url) {
    var req = new XMLHttpRequest()
    req.open('GET', url, true)
    req.overrideMimeType('text\/plain; charset=x-user-defined')
    req.onload = function (e) {
        //Variable reinitialization
        indexRegister = 0
        programCounter = 0x200
        delayTimer = 0
        soundTimer = 0
        memory = []
        V = []
        stack = []
        for (var i = 0; i < 512; ++i) {
            memory.push(0)
        }
        for (var i = 0; i < 16; ++i) {
            V.push(0)
        }
        for (var i = 0; i < fontset.length; ++i) {
            memory[i] = fontset[i]
        }
        clearScreen()
        //Reads the file into memory starting at address 0x200 (512)
        for (var i = 0; i < req.responseText.length; ++i) {
            memory.push(req.responseText.charCodeAt(i) & 0xFF)
        }
        gameStarted = true
        //Clears the game loop if it is already running and starts a new one
        if (gameInterval != null) {
            clearInterval(gameInterval)
            clearInterval(timerInterval)
        }
        gameInterval = setInterval(runCycle, 0)
        timerInterval = setInterval(updateTimers, 17)
    }
    req.send(null)
}

/*
 * This function is called whenever an invalid opcode or instruction is executed
 */
function invalidOpcode(opcode) {
    console.log("Invalid opcode " + opcode + " at memory address " + programCounter)
}

/*
 * The run cycle executes a single opcode or instruction from two spaces in the memory
 */
function runCycle() {
    opcode = memory[programCounter] << 8 | memory[programCounter + 1]
    switch (opcode & 0xF000) {
        case 0x0000:
            if (opcode == 0x00E0) {
                /*
                 * Instruction: 0x00E0
                 * Description: Clears the screen.
                 * Assembly code: CLS
                 */
                clearScreen()
            } else if (opcode == 0x00EE) {
                /*
                 * Instruction: 0x00EE
                 * Description: Return from a subroutine.
                 * Assembly code: RET
                 */
                programCounter = stack.pop()
            } else {
                /*
                 * This instruction is no longer used by modern interpreters.
                 * 
                 * Instruction: 0x0nnn
                 * Description: Jump to a machine code routine at nnn.
                 * Assembly code: SYS addr
                 */
                invalidOpcode(opcode)
            }
            programCounter += 2
            break
        case 0x1000:
            /*
             * Instruction: 0x1nnn
             * Description: Jumps to address nnn.
             * Assembly code: JP addr
             */
            programCounter = opcode & 0x0FFF
            break
        case 0x2000:
            /*
             * Instruction: 0x2nnn
             * Description: Calls a subroutine at nnn.
             * Assembly code: CALL addr
             */
            stack.push(programCounter)
            programCounter = opcode & 0x0FFF
            break
        case 0x3000:
            /*
             * Instruction: 0x3xnn
             * Description: Skips the next instruction if Vx = nn.
             * Assembly code: SE Vx, byte
             */
            if (V[(opcode & 0x0F00) >> 8] == (opcode & 0x00FF)) {
                programCounter += 4
            } else {
                programCounter += 2
            }
            break
        case 0x4000:
            /*
             * Instruction: 0x4xnn
             * Description: Skips the next instruction if Vx != nn.
             * Assembly code: SNE Vx, byte
             */
            if (V[(opcode & 0x0F00) >> 8] == (opcode & 0x00FF)) {
                programCounter += 2
            } else {
                programCounter += 4
            }
            break
        case 0x5000:
            /*
             * Instruction: 0x5xy0
             * Description: Skips the next instruction if Vx = Vy.
             * Assembly code: SE Vx, Vy
             */
            if ((opcode & 0x000F) == 0x0000) {
                if (V[(opcode & 0x0F00) >> 8] == V[(opcode & 0x00F0) >> 4]) {
                    programCounter += 2
                }
            } else {
                invalidOpcode(opcode) //undefined instruction
            }
            programCounter += 2
            break
        case 0x6000:
            /*
             * Instruction: 0x6xnn
             * Description: Sets Vx = nn.
             * Assembly code: LD Vx, byte
             */
            V[(opcode & 0x0F00) >> 8] = opcode & 0x00FF
            programCounter += 2
            break
        case 0x7000:
            /*
             * Instruction: 0x7xnn
             * Description: Sets Vx = Vx + nn.
             * Assembly code: ADD Vx, byte
             */
            V[(opcode & 0x0F00) >> 8] += opcode & 0x00FF
            V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
            programCounter += 2
            break
        case 0x8000:
            switch (opcode & 0x000F) {
                case 0x0000:
                    /*
                     * Instruction: 0x8xy0
                     * Description: Sets Vx = Vy.
                     * Assembly code: LD Vx, Vy
                     */
                    V[(opcode & 0x0F00) >> 8] = V[(opcode & 0x00F0) >> 4]
                    break
                case 0x0001:
                    /*
                     * Instruction: 0x8xy1
                     * Description: Sets Vx |= Vy.
                     * Assembly code: OR Vx, Vy
                     */
                    V[(opcode & 0x0F00) >> 8] |= V[(opcode & 0x00F0) >> 4]
                    break
                case 0x0002:
                    /*
                     * Instruction: 0x8xy2
                     * Description: Sets Vx &= Vy.
                     * Assembly code: AND Vx, Vy
                     */
                    V[(opcode & 0x0F00) >> 8] &= V[(opcode & 0x00F0) >> 4]
                    break
                case 0x0003:
                    /*
                     * Instruction: 0x8xy3
                     * Description: Sets Vx ^= Vy.
                     * Assembly code: XOR Vx, Vy
                     */
                    V[(opcode & 0x0F00) >> 8] ^= V[(opcode & 0x00F0) >> 4]
                    break
                case 0x0004:
                    /*
                     * Instruction: 0x8xy4
                     * Description: Sets Vx += Vy and VF = carry bit.
                     * Assembly code: ADD Vx, Vy
                     */
                    if (V[(opcode & 0x00F0) >> 4] > (0x00FF - V[(opcode & 0x0F00) >> 8])) {
                        V[0xF] = 1
                    } else {
                        V[0xF] = 0
                    }
                    V[(opcode & 0x0F00) >> 8] += V[(opcode & 0x00F0) >> 4]
                    V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
                    break
                case 0x0005:
                    /*
                     * Instruction: 0x8xy5
                     * Description: Sets Vx -= Vy and VF = !borrow bit.
                     * Assembly code: SUB Vx, Vy
                     */
                    if (V[(opcode & 0x00F0) >> 4] > V[(opcode & 0x0F00) >> 8]) {
                        V[0xF] = 0
                    } else {
                        V[0xF] = 1
                    }
                    V[(opcode & 0x0F00) >> 8] -= V[(opcode & 0x00F0) >> 4]
                    V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
                    break
                case 0x0006:
                    /*
                     * This instruction and 0x8xyE originally used to shift Vy instead of Vx
                     * however modern interpreters apply the bit shift only to Vx
                     * 
                     * Instruction: 0x8xy6
                     * Description: Sets Vx = Vx >> 1 and VF = least significant bit.
                     * Assembly code: SHR Vx {, Vx}
                     */
                    V[0xF] = V[(opcode & 0x0F00) >> 8] & 0x0001
                    V[(opcode & 0x0F00) >> 8] = V[(opcode & 0x0F00) >> 8] >> 1
                    V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
                    break
                case 0x0007:
                    /*
                     * Instruction: 0x8xy7
                     * Description: Sets Vx = Vy - Vx, set VF = !borrow bit.
                     * Assembly code: SUBN Vx, Vy
                     */
                    if (V[(opcode & 0x0F00) >> 8] > V[(opcode & 0x00F0) >> 4]) {
                        V[0xF] = 0
                    } else {
                        V[0xF] = 1
                    }
                    V[(opcode & 0x0F00) >> 8] = V[(opcode & 0x00F0) >> 4] - V[(opcode & 0x0F00) >> 8]
                    V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
                    break
                case 0x000E:
                    /*
                     * This instruction and 0x8xy6 originally used to shift Vy instead of Vx
                     * however modern interpreters apply the bit shift only to Vx
                     * 
                     * Instruction: 0x8xyE
                     * Description: Sets Vx = Vx << 1 and VF = most significant bit.
                     * Assembly code: SHL Vx {, Vx}
                     */
                    V[0xF] = V[(opcode & 0x0F00) >> 8] & 0x8000
                    V[(opcode & 0x0F00) >> 8] = V[(opcode & 0x0F00) >> 8] << 1
                    V[(opcode & 0x0F00) >> 8] %= 256 //prevents overflow
                    break
                default:
                    invalidOpcode(opcode) //undefined instruction
            }
            programCounter += 2
            break
        case 0x9000:
            /*
             * Instruction: 0x9xy0
             * Description: Skips the next instruction if Vx != Vy.
             * Assembly code: SNE Vx, Vy
             */
            if ((opcode & 0x000F) == 0x0000) {
                if (V[(opcode & 0x0F00) >> 8] != V[(opcode & 0x00F0) >> 4]) {
                    programCounter += 2
                }
            } else {
                invalidOpcode(opcode)
            }
            programCounter += 2
            break
        case 0xA000:
            /*
             * Instruction: 0xAnnn
             * Description: Sets the index register I = nnn.
             * Assembly code: LD I, addr
             */
            indexRegister = opcode & 0x0FFF
            programCounter += 2
            break
        case 0xB000:
            /*
             * Instruction: 0xBnnn
             * Description: Jumps to memory address nnn + V0.
             * Assembly code: JP V0, addr
             */
            programCounter = V[0x0] + (opcode & 0x0FFF)
            break
        case 0xC000:
            /*
             * Instruction: 0xCxnn
             * Description: Sets Vx = a random byte AND nn.
             * Assembly code: RND Vx, byte
             */
            V[(opcode & 0x0F00) >> 8] = (Math.random() * 256) & (opcode & 0x00FF)
            programCounter += 2
            break
        case 0xD000:
            /*
             * The expression (line & (0x80 >> j)) != 0 iterates through each pixel in a horizontal line
             * 
             * Instruction: 0xDxyn
             * Description: Displays a sprite of height n and width 8 starting at memory location I at (Vx, Vy) on the screen, while setting VF = 1 if a lit pixel is found, or 0 if not.
             * Assembly code: DRW Vx, Vy, nibble
             */
            V[0xF] = 0
            for (var i = 0; i < (opcode & 0x000F); ++i) {
                var line = memory[indexRegister + i]
                for (var j = 0; j < 8; ++j) {
                    if ((line & (0x80 >> j)) != 0) {
                        //The screen pixels have a modulus expression which prevents them from overflowing
                        if (pixels[(64 * (V[(opcode & 0x00F0) >> 4] + i) + V[(opcode & 0x0F00) >> 8] + j) % 2048]) {
                            V[0xF] = 1
                        }
                        pixels[(64 * (V[(opcode & 0x00F0) >> 4] + i) + V[(opcode & 0x0F00) >> 8] + j) % 2048] ^= true
                    }
                }
            }
            draw() //redraws the screen
            programCounter += 2
            break
        case 0xE000:
            if ((opcode & 0x00FF) == 0x009E) {
                /*
                 * Instruction: 0xEx9E
                 * Description: Skips the next instruction if the key with the index stored in Vx is pressed.
                 * Assembly code: SKP Vx
                 */
                if (keys[V[(opcode & 0x0F00) >> 8]]) {
                    programCounter += 2
                }
            } else if ((opcode & 0x00FF) == 0x00A1) {
                /*
                 * Instruction: 0xExA1
                 * Description: Skips the next instruction if the key with the index stored in Vx is not pressed.
                 * Assembly code: SKNP Vx
                 */
                if (!keys[V[(opcode & 0x0F00) >> 8]]) {
                    programCounter += 2
                }
            } else {
                invalidOpcode(opcode) //undefined instruction
            }
            programCounter += 2
            break
        case 0xF000:
            switch (opcode & 0x00FF) {
                case 0x0007:
                    /*
                     * Instruction: 0xFx07
                     * Description: Sets Vx = delay timer value.
                     * Assembly code: LD Vx, DT
                     */
                    V[(opcode & 0x0F00) >> 8] = delayTimer
                    break
                case 0x000A:
                    /*
                     * Instruction: 0xFx0A
                     * Description: Waits for a key press then stores the value of that key in Vx.
                     * Assembly code: LD Vx, K
                     */
                    var keyPressed = false
                    for (var i = 0; i < 16; ++i) {
                        if (keys[i]) {
                            V[(opcode & 0x0F00) >> 8] = i
                            keyPressed = true
                        }
                    }
                    if (!keyPressed) {
                        return
                    }
                    break
                case 0x0015:
                    /*
                     * Instruction: 0xFx15
                     * Description: Sets the delay timer = Vx.
                     * Assembly code: LD DT, Vx
                     */
                    delayTimer = V[(opcode & 0x0F00) >> 8]
                    break
                case 0x0018:
                    /*
                     * Instruction: 0xFx18
                     * Description: Sets the sound timer = Vx.
                     * Assembly code: LD ST, Vx
                     */
                    soundTimer = V[(opcode & 0x0F00) >> 8]
                    break
                case 0x001E:
                    /*
                     * An undocument feature of CHIP-8 is that when there is a range overflow VF is set to 1, and when there isn't it is set to 0
                     * 
                     * Instruction: 0xFx1E
                     * Description: Sets the index register I += Vx.
                     * Assembly code: ADD I, Vx
                     */
                    if (indexRegister + V[(opcode & 0x0F00) >> 8] > 0x0FFF) {
                        V[0xF] = 1
                    } else {
                        V[0xF] = 0
                    }
                    indexRegister += V[(opcode & 0x0F00) >> 8]
                    indexRegister %= 4096 //prevents overflow
                    break
                case 0x0029:
                    /*
                     * Instruction: 0xFx29
                     * Description: Sets I = the location of sprite for the digit Vx.
                     * Assembly code: LD F, Vx
                     */
                    indexRegister = V[(opcode & 0x0F00) >> 8] * 0x5
                    indexRegister %= 4096 //prevents overflow
                    break
                case 0x0033:
                    /*
                     * This essentially separates the value in Vx into the hundreds, tens and digits place for displaying scores
                     * 
                     * Instruction: 0xFx33
                     * Description: Stores the BCD representation of Vx in memory locations I, I+1, and I+2.
                     * Assembly code: LD B, Vx
                     */
                    memory[indexRegister] = Math.floor(V[(opcode & 0x0F00) >> 8] / 100)
                    memory[indexRegister + 1] = Math.floor(V[(opcode & 0x0F00) >> 8] / 10) % 10
                    memory[indexRegister + 2] = (V[(opcode & 0x0F00) >> 8] % 100) % 10
                    break
                case 0x0055:
                    /*
                     * Instruction: 0xFx55
                     * Description: Store the registers from V0 to Vx in memory starting at location I.
                     * Assembly code: LD [I], Vx
                     */
                    for (var i = 0; i <= ((opcode & 0x0F00) >> 8); ++i) {
                        memory[indexRegister] = V[i]
                        ++indexRegister
                    }
                    break
                case 0x0065:
                    /*
                     * Instruction: 0xFx65
                     * Description: Sets the registers from V0 to Vx to the values in memory starting at location I.
                     * Assembly code: LD Vx, [I]
                     */
                    for (var i = 0; i <= ((opcode & 0x0F00) >> 8); ++i) {
                        V[i] = memory[indexRegister]
                        ++indexRegister
                    }
                    break
                default:
                    invalidOpcode(opcode) //undefined instruction
            }
            programCounter += 2
            break
    }
}

/*
 * Updates the sound and delay timers at a rate of 60Hz
 */
function updateTimers() {
    if (delayTimer > 0) {
        --delayTimer
    }
    if (soundTimer > 0) {
        beep.play() //plays the beep while the sound timer is bigger than zero
        --soundTimer
    }
}

/*
 * The following three functions check and update the key array in order to provide input for the game
 */
document.onkeypress = function (event) {
    var key = (event || window.event).keyCode
    for (var i = 0; i < 16; i++) {
        if (key == keyset[i]) {
            keys[i] = true
            break
        }
    }
}

document.onkeydown = function (event) {
    var key = (event || window.event).keyCode
    for (var i = 0; i < 16; i++) {
        if (key == keyset[i]) {
            keys[i] = true
            break
        }
    }
}

document.onkeyup = function (event) {
    var key = (event || window.event).keyCode
    for (var i = 0; i < 16; i++) {
        if (key == keyset[i]) {
            keys[i] = false
            break
        }
    }
}

/*
 * Checks for a keypress in order to update the user's custom controls
 */
document.addEventListener("keydown", function (event) {
    if (settingKey) {
        keyset[settingId] = event.keyCode
        var button = document.getElementById("btn" + settingId)
        button.textContent = String.fromCharCode(event.keyCode)
        button.classList.remove("setting")
        settingKey = false
        localStorage.setItem("keyset", JSON.stringify(keyset)) //Array must be stored as a string
    }
    event.stopPropagation()
    event.preventDefault()
})

/*
 * Configures several page items after the website has fully loaded
 */
window.onload = function () {
    /*
     * Makes the games in the list clickable and loads the game that the user wishes to play
     */
    var games = document.getElementsByClassName("tile")
    for (var i = 0; i < games.length; ++i) {
        games[i].onclick = function () {
            if (this.id == "custom") {
                var url = prompt("Please enter the URL where the ROM is located: ")
                if (url == null) {
                    return
                }
                loadGame(url)
            } else {
                loadGame("https://raw.githubusercontent.com/jamesscn/chipeight/master/roms/" + this.id + ".rom")
            }
            scroll(0, 0)
            document.getElementById("name").textContent = this.children[0].textContent
            document.getElementById("info").innerHTML = this.children[1].alt
        }
    }
    /*
     * Handles when the user decides to change colours and keybindings
     */
    var bg = document.getElementById("background")
    var fg = document.getElementById("foreground")
    bg.onchange = function () {
        background = "#" + bg.value
        localStorage.setItem("background", background)
        draw()
    }
    fg.onchange = function () {
        foreground = "#" + fg.value
        localStorage.setItem("foreground", foreground)
        draw()
    }
    for (var i = 0; i < 16; ++i) {
        var btn = document.getElementById("btn" + i)
        btn.setAttribute("btnid", i)
        btn.onclick = function (event) {
            if (settingKey) {
                document.getElementById("btn" + settingId).classList.remove("setting")
            }
            settingKey = true
            settingId = this.getAttribute("btnid")
            if (!this.classList.contains("setting")) {
                this.classList.add("setting")
            }
            event.preventDefault()
        }
    }
}

/*
 * Makes the screen blank while no game is selected
 */
clearScreen()