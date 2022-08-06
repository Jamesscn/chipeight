#include <algorithm>
#include <iterator>
#include <iostream>
#include <fstream>
#include <iomanip>
#include <string>

using namespace std;

string hexToStr(int value, bool prefix) {
    string result;
    if(value == 0) {
        result = "0";
    }
    while(value > 0) {
        int digit = value & 0xF;
        if(digit < 10) {
            result += digit + 48;
        } else {
            result += digit + 'A' - 10;
        }
        value >>= 4;
    }
    if(prefix) {
        result += "x0";
    }
    reverse(result.begin(), result.end());
    return result;
}

string hexToStr(int value) {
    return hexToStr(value, true);
}

string getInstruction(int opcode) {
    switch (opcode & 0xF000) {
        case 0x0000:
            if (opcode == 0x00E0) {
                /*
                 * Instruction: 0x00E0
                 * Description: Clears the screen.
                 * Assembly code: CLS
                 */
                return "cls";
            } else if (opcode == 0x00EE) {
                /*
                 * Instruction: 0x00EE
                 * Description: Return from a subroutine.
                 * Assembly code: RET
                 */
                return "ret";
            } else {
                /*
                 * This instruction is no longer used by modern interpreters.
                 * 
                 * Instruction: 0x0nnn
                 * Description: Jump to a machine code routine at nnn.
                 * Assembly code: SYS addr
                 */
                return "sys\t" + hexToStr(opcode & 0x0FFF);
            }
            break;
        case 0x1000:
            /*
             * Instruction: 0x1nnn
             * Description: Jumps to address nnn.
             * Assembly code: JP addr
             */
            return "jmp\t" + hexToStr(opcode & 0x0FFF);
            break;
        case 0x2000:
            /*
             * Instruction: 0x2nnn
             * Description: Calls a subroutine at nnn.
             * Assembly code: CALL addr
             */
            return "call\t" + hexToStr(opcode & 0x0FFF);
            break;
        case 0x3000:
            /*
             * Instruction: 0x3xnn
             * Description: Skips the next instruction if Vx = nn.
             * Assembly code: SE Vx, byte
             */
            return "se\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", " + hexToStr(opcode & 0x00FF);
            break;
        case 0x4000:
            /*
             * Instruction: 0x4xnn
             * Description: Skips the next instruction if Vx != nn.
             * Assembly code: SNE Vx, byte
             */
            return "sne\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", " + hexToStr(opcode & 0x00FF);
            break;
        case 0x5000:
            /*
             * Instruction: 0x5xy0
             * Description: Skips the next instruction if Vx = Vy.
             * Assembly code: SE Vx, Vy
             */
            if ((opcode & 0x000F) == 0x0000) {
                return "se\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
            } else {
                return "null\t" + hexToStr(opcode); //Bad opcode
            }
            break;
        case 0x6000:
            /*
             * Instruction: 0x6xnn
             * Description: Sets Vx = nn.
             * Assembly code: LD Vx, byte
             */
            return "mov\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", " + hexToStr(opcode & 0x00FF);
            break;
        case 0x7000:
            /*
             * Instruction: 0x7xnn
             * Description: Sets Vx = Vx + nn.
             * Assembly code: ADD Vx, byte
             */
            return "add\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", " + hexToStr(opcode & 0x00FF);
            break;
        case 0x8000:
            switch (opcode & 0x000F) {
                case 0x0000:
                    /*
                     * Instruction: 0x8xy0
                     * Description: Sets Vx = Vy.
                     * Assembly code: LD Vx, Vy
                     */
                    return "mov\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0001:
                    /*
                     * Instruction: 0x8xy1
                     * Description: Sets Vx |= Vy.
                     * Assembly code: OR Vx, Vy
                     */
                    return "or\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0002:
                    /*
                     * Instruction: 0x8xy2
                     * Description: Sets Vx &= Vy.
                     * Assembly code: AND Vx, Vy
                     */
                    return "and\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0003:
                    /*
                     * Instruction: 0x8xy3
                     * Description: Sets Vx ^= Vy.
                     * Assembly code: XOR Vx, Vy
                     */
                    return "xor\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0004:
                    /*
                     * Instruction: 0x8xy4
                     * Description: Sets Vx += Vy and VF = carry bit.
                     * Assembly code: ADD Vx, Vy
                     */
                    return "add\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0005:
                    /*
                     * Instruction: 0x8xy5
                     * Description: Sets Vx -= Vy and VF = !borrow bit.
                     * Assembly code: SUB Vx, Vy
                     */
                    return "sub\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0006:
                    /*
                     * This instruction and 0x8xyE originally used to shift Vy instead of Vx
                     * however modern interpreters apply the bit shift only to Vx
                     * 
                     * Instruction: 0x8xy6
                     * Description: Sets Vx = Vx >> 1 and VF = least significant bit.
                     * Assembly code: SHR Vx {, Vx}
                     */
                    return "shr\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x0007:
                    /*
                     * Instruction: 0x8xy7
                     * Description: Sets Vx = Vy - Vx, set VF = !borrow bit.
                     * Assembly code: SUBN Vx, Vy
                     */
                    return "subn\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                case 0x000E:
                    /*
                     * This instruction and 0x8xy6 originally used to shift Vy instead of Vx
                     * however modern interpreters apply the bit shift only to Vx
                     * 
                     * Instruction: 0x8xyE
                     * Description: Sets Vx = Vx << 1 and VF = most significant bit.
                     * Assembly code: SHL Vx {, Vx}
                     */
                    return "shl\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
                    break;
                default:
                    return "null\t" + hexToStr(opcode);
            }
            break;
        case 0x9000:
            if ((opcode & 0x000F) == 0x0000) {
                /*
                * Instruction: 0x9xy0
                * Description: Skips the next instruction if Vx != Vy.
                * Assembly code: SNE Vx, Vy
                */
                return "sne\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false);
            } else {
                return "null\t" + hexToStr(opcode);
            }
            break;
        case 0xA000:
            /*
             * Instruction: 0xAnnn
             * Description: Sets the index register I = nnn.
             * Assembly code: LD I, addr
             */
            return "lea\tI, " + hexToStr(opcode & 0x0FFF);
            break;
        case 0xB000:
            /*
             * Instruction: 0xBnnn
             * Description: Jumps to memory address nnn + V0.
             * Assembly code: JP V0, addr
             */
            return "jmp\tV0, " + hexToStr(opcode & 0x0FFF);
            break;
        case 0xC000:
            /*
             * Instruction: 0xCxnn
             * Description: Sets Vx = a random byte AND nn.
             * Assembly code: RND Vx, byte
             */
            return "rand\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", " + hexToStr(opcode & 0x00FF);
            break;
        case 0xD000:
            /*
             * The expression (line & (0x80 >> j)) != 0 iterates through each pixel in a horizontal line
             * 
             * Instruction: 0xDxyn
             * Description: Displays a sprite of height n and width 8 starting at memory location I at (Vx, Vy) on the screen, while setting VF = 1 if a lit pixel is found, or 0 if not.
             * Assembly code: DRW Vx, Vy, nibble
             */
            return "draw\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", V" + hexToStr((opcode & 0x00F0) >> 4, false) + ", " + hexToStr(opcode & 0x000F);
            break;
        case 0xE000:
            if ((opcode & 0x00FF) == 0x009E) {
                /*
                 * Instruction: 0xEx9E
                 * Description: Skips the next instruction if the key with the index stored in Vx is pressed.
                 * Assembly code: SKP Vx
                 */
                return "skip\tV" + hexToStr((opcode & 0x0F00) >> 8, false);
            } else if ((opcode & 0x00FF) == 0x00A1) {
                /*
                 * Instruction: 0xExA1
                 * Description: Skips the next instruction if the key with the index stored in Vx is not pressed.
                 * Assembly code: SKNP Vx
                 */
                return "sknp\tV" + hexToStr((opcode & 0x0F00) >> 8, false);
            } else {
                return "null\t" + hexToStr(opcode);
            }
            break;
        case 0xF000:
            switch (opcode & 0x00FF) {
                case 0x0007:
                    /*
                     * Instruction: 0xFx07
                     * Description: Sets Vx = delay timer value.
                     * Assembly code: LD Vx, DT
                     */
                    return "lea\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", DT";
                    break;
                case 0x000A:
                    /*
                     * Instruction: 0xFx0A
                     * Description: Waits for a key press then stores the value of that key in Vx.
                     * Assembly code: LD Vx, K
                     */
                    return "lea\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", K";
                    break;
                case 0x0015:
                    /*
                     * Instruction: 0xFx15
                     * Description: Sets the delay timer = Vx.
                     * Assembly code: LD DT, Vx
                     */
                    return "lea\tDT, V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x0018:
                    /*
                     * Instruction: 0xFx18
                     * Description: Sets the sound timer = Vx.
                     * Assembly code: LD ST, Vx
                     */
                    return "lea\tST, V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x001E:
                    /*
                     * An undocument feature of CHIP-8 is that when there is a range overflow VF is set to 1, and when there isn't it is set to 0
                     * 
                     * Instruction: 0xFx1E
                     * Description: Sets the index register I += Vx.
                     * Assembly code: ADD I, Vx
                     */
                    return "add\tI, V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x0029:
                    /*
                     * Instruction: 0xFx29
                     * Description: Sets I = the location of sprite for the digit Vx.
                     * Assembly code: LD F, Vx
                     */
                    return "lea\tF, V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x0033:
                    /*
                     * This essentially separates the value in Vx into the hundreds, tens and digits place for displaying scores
                     * 
                     * Instruction: 0xFx33
                     * Description: Stores the BCD representation of Vx in memory locations I, I+1, and I+2.
                     * Assembly code: LD B, Vx
                     */
                    return "lea\tB, V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x0055:
                    /*
                     * Instruction: 0xFx55
                     * Description: Store the registers from V0 to Vx in memory starting at location I.
                     * Assembly code: LD [I], Vx
                     */
                    return "lea\t[I], V" + hexToStr((opcode & 0x0F00) >> 8, false);
                    break;
                case 0x0065:
                    /*
                     * Instruction: 0xFx65
                     * Description: Sets the registers from V0 to Vx to the values in memory starting at location I.
                     * Assembly code: LD Vx, [I]
                     */
                    return "lea\tV" + hexToStr((opcode & 0x0F00) >> 8, false) + ", [I]";
                    break;
                default:
                    return "null\t" + hexToStr(opcode);
            }
            break;
    }
    return "null\t" + hexToStr(opcode);
}

bool verbose = false;

void parseRom(string rom) {
    if(verbose) {
        cout << "  DISASSEMBLED ROM" << endl;
        cout << "-----------------------------------------" << endl;
        cout << "  ADDRESS\tINSTRUCTION" << endl;
    }
    int value = 0;
    int location = 512;
    for(int i = 0; i < rom.size(); i++) {
        int hexVal = rom[i] & 0xFF;
        value += hexVal;
        if(i % 2 == 1) {
            string instruction = getInstruction(value);
            if(verbose) {
                cout << "0x" << setfill('0') << setw(4) << hex << location << " ";
                cout << setfill(' ') << setw(4) << dec << location << " | ";
                cout << "0x" << setfill('0') << setw(4) << hex << value << ": ";
            }
            cout << instruction << endl;
            value = 0;
            location += 2;
        }
        value *= 256;
    }
}

int main(int argc, char** argv) {
    string filename = "";
    for(int i = 1; i < argc; i++) {
        string param = argv[i];
        if(param.find("-v") != string::npos) {
            verbose = true;
        } else if (filename == "") {
            filename = param;
        } else {
            cerr << "Syntax: " << argv[0] << " [-v] file.rom" << endl;
            exit(1);
        }
    }
    if(filename == "") {
        noskipws(cin);
        istream_iterator<char> it(cin);
        istream_iterator<char> end;
        string rom(it, end);
        parseRom(rom);
    } else {
        ifstream romFile(filename);
        if(romFile.is_open()) {
            noskipws(romFile);
            istream_iterator<char> it(romFile);
            istream_iterator<char> end;
            string rom(it, end);
            parseRom(rom);
            romFile.close();
        } else {
            cerr << "The file " << filename << " could not be read!" << endl;
            exit(1);
        }
    }    
}