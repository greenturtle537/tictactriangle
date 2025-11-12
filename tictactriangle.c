#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#define MAX_BOARDS 100
#define MAX_MOVES 2000
#define GRID_SIZE 200
#define GRID_OFFSET 100

// ANSI color codes
#define COLOR_RESET "\033[0m"
#define COLOR_RED "\033[31m"
#define COLOR_GREEN "\033[32m"
#define COLOR_YELLOW "\033[33m"
#define COLOR_BLUE "\033[34m"
#define COLOR_MAGENTA "\033[35m"
#define COLOR_CYAN "\033[36m"
#define COLOR_BRIGHT_RED "\033[91m"
#define COLOR_BRIGHT_GREEN "\033[92m"
#define COLOR_BRIGHT_YELLOW "\033[93m"
#define COLOR_DIM "\033[2m"

typedef enum { EMPTY = 0, X_MARK = 1, O_MARK = 2, TRIANGLE = 3 } CellType;
typedef enum { PLAYER_X = 0, PLAYER_O = 1 } Player;

typedef struct {
    int x, y;
    Player player;
} Move;

typedef struct {
    int origin_x, origin_y; // Top-left corner of 3x3 board
    int scores[2]; // Points scored by each player on this board
    int triangle_scores[2]; // Times each player scored triangles (max 1 each)
    bool active; // Is this board still being played?
    bool scored_cells[3][3][2]; // Track which cells have been scored by each player
} Board;

typedef struct {
    CellType grid[GRID_SIZE][GRID_SIZE]; // Global grid
    Board boards[MAX_BOARDS];
    int num_boards;
    Move move_history[MAX_MOVES];
    int num_moves;
    int total_scores[2];
    Player current_player;
    int current_board_idx;
    bool awaiting_board_placement;
} GameState;

void init_game(GameState *game) {
    memset(game, 0, sizeof(GameState));
    
    // Initialize first board at (0, 0)
    game->boards[0].origin_x = GRID_OFFSET;
    game->boards[0].origin_y = GRID_OFFSET;
    game->boards[0].active = true;
    game->num_boards = 1;
    game->current_player = PLAYER_X;
    game->current_board_idx = 0;
    game->awaiting_board_placement = false;
}

CellType get_cell(GameState *game, int x, int y) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE)
        return EMPTY;
    return game->grid[y][x];
}

void set_cell(GameState *game, int x, int y, CellType value) {
    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        game->grid[y][x] = value;
    }
}

bool is_in_board(Board *board, int x, int y) {
    return x >= board->origin_x && x < board->origin_x + 3 &&
           y >= board->origin_y && y < board->origin_y + 3;
}

bool boards_touch(Board *existing, int new_x, int new_y) {
    // Check if new board (at new_x, new_y) touches existing board horizontally or vertically
    int ex = existing->origin_x;
    int ey = existing->origin_y;
    
    // Horizontal touching (share a vertical edge)
    if ((new_x + 3 == ex || ex + 3 == new_x) && 
        !(new_y + 3 <= ey || ey + 3 <= new_y)) {
        return true;
    }
    
    // Vertical touching (share a horizontal edge)
    if ((new_y + 3 == ey || ey + 3 == new_y) && 
        !(new_x + 3 <= ex || ex + 3 <= new_x)) {
        return true;
    }
    
    return false;
}

bool is_valid_board_position(GameState *game, int origin_x, int origin_y) {
    // Check if any existing board would overlap
    for (int i = 0; i < game->num_boards; i++) {
        Board *b = &game->boards[i];
        int bx = b->origin_x;
        int by = b->origin_y;
        
        // Check for overlap
        if (!(origin_x + 3 <= bx || bx + 3 <= origin_x || 
              origin_y + 3 <= by || by + 3 <= origin_y)) {
            return false; // Boards overlap
        }
    }
    
    // Must touch at least one existing board
    for (int i = 0; i < game->num_boards; i++) {
        if (boards_touch(&game->boards[i], origin_x, origin_y)) {
            return true;
        }
    }
    
    return false;
}

int count_in_line(GameState *game, int x, int y, int dx, int dy, Player player) {
    CellType target = (player == PLAYER_X) ? X_MARK : O_MARK;
    int count = 0;
    
    for (int i = 0; i < 10; i++) { // Check up to 10 in each direction
        int nx = x + dx * i;
        int ny = y + dy * i;
        CellType cell = get_cell(game, nx, ny);
        
        if (cell == target || cell == TRIANGLE) {
            count++;
        } else {
            break;
        }
    }
    
    return count;
}

int score_position(GameState *game, Board *board, int x, int y, Player player) {
    int total_points = 0;
    CellType cell = get_cell(game, x, y);
    
    // Helper to mark cells as scored
    auto void mark_scored_in_line(int sx, int sy, int dx, int dy, int count) {
        for (int i = 0; i < count; i++) {
            int px = sx + dx * i;
            int py = sy + dy * i;
            // Find which board this cell belongs to and mark it
            for (int b = 0; b < game->num_boards; b++) {
                Board *brd = &game->boards[b];
                if (px >= brd->origin_x && px < brd->origin_x + 3 &&
                    py >= brd->origin_y && py < brd->origin_y + 3) {
                    int local_x = px - brd->origin_x;
                    int local_y = py - brd->origin_y;
                    brd->scored_cells[local_y][local_x][player] = true;
                    break;
                }
            }
        }
    }
    
    // Horizontal
    int left = count_in_line(game, x - 1, y, -1, 0, player);
    int right = count_in_line(game, x + 1, y, 1, 0, player);
    if (left + right + 1 >= 3) {
        int points = left + right + 1;
        total_points += points;
        mark_scored_in_line(x - left, y, 1, 0, points);
    }
    
    // Vertical
    int up = count_in_line(game, x, y - 1, 0, -1, player);
    int down = count_in_line(game, x, y + 1, 0, 1, player);
    if (up + down + 1 >= 3) {
        int points = up + down + 1;
        total_points += points;
        mark_scored_in_line(x, y - up, 0, 1, points);
    }
    
    // Diagonal (top-left to bottom-right)
    int tl = count_in_line(game, x - 1, y - 1, -1, -1, player);
    int br = count_in_line(game, x + 1, y + 1, 1, 1, player);
    if (tl + br + 1 >= 3) {
        int points = tl + br + 1;
        total_points += points;
        mark_scored_in_line(x - tl, y - tl, 1, 1, points);
    }
    
    // Anti-diagonal (top-right to bottom-left)
    int tr = count_in_line(game, x + 1, y - 1, 1, -1, player);
    int bl = count_in_line(game, x - 1, y + 1, -1, 1, player);
    if (tr + bl + 1 >= 3) {
        int points = tr + bl + 1;
        total_points += points;
        mark_scored_in_line(x + tr, y - tr, -1, 1, points);
    }
    
    // Handle triangle scoring limits
    if (cell == TRIANGLE) {
        if (board->triangle_scores[player] >= 1) {
            return 0; // Can't score this triangle again
        }
        board->triangle_scores[player]++;
    }
    
    return total_points;
}

bool is_board_full(GameState *game, Board *board) {
    for (int y = 0; y < 3; y++) {
        for (int x = 0; x < 3; x++) {
            CellType cell = get_cell(game, board->origin_x + x, board->origin_y + y);
            if (cell == EMPTY) return false;
        }
    }
    return true;
}

void place_triangles(GameState *game, Board *board, Player creator) {
    // Check all positions on the new board for potential 3+ combinations
    for (int y = 0; y < 3; y++) {
        for (int x = 0; x < 3; x++) {
            int gx = board->origin_x + x;
            int gy = board->origin_y + y;
            
            if (get_cell(game, gx, gy) != EMPTY) continue;
            
            // Temporarily place the creator's mark
            CellType mark = (creator == PLAYER_X) ? X_MARK : O_MARK;
            set_cell(game, gx, gy, mark);
            
            // Check if this would score
            bool would_score = false;
            
            // Check horizontal
            int h_count = count_in_line(game, gx - 1, gy, -1, 0, creator) + 
                         count_in_line(game, gx + 1, gy, 1, 0, creator) + 1;
            if (h_count >= 3) would_score = true;
            
            // Check vertical
            int v_count = count_in_line(game, gx, gy - 1, 0, -1, creator) + 
                         count_in_line(game, gx, gy + 1, 0, 1, creator) + 1;
            if (v_count >= 3) would_score = true;
            
            // Check diagonals
            int d1_count = count_in_line(game, gx - 1, gy - 1, -1, -1, creator) + 
                          count_in_line(game, gx + 1, gy + 1, 1, 1, creator) + 1;
            if (d1_count >= 3) would_score = true;
            
            int d2_count = count_in_line(game, gx + 1, gy - 1, 1, -1, creator) + 
                          count_in_line(game, gx - 1, gy + 1, -1, 1, creator) + 1;
            if (d2_count >= 3) would_score = true;
            
            // Remove temporary mark
            set_cell(game, gx, gy, EMPTY);
            
            if (would_score) {
                set_cell(game, gx, gy, TRIANGLE);
            }
        }
    }
}

bool check_triple_triangle(GameState *game, Board *board) {
    // Check for 3+ triangles in any row, column, or diagonal
    for (int y = 0; y < 3; y++) {
        int count = 0;
        for (int x = 0; x < 3; x++) {
            if (get_cell(game, board->origin_x + x, board->origin_y + y) == TRIANGLE)
                count++;
        }
        if (count >= 3) return true;
    }
    
    for (int x = 0; x < 3; x++) {
        int count = 0;
        for (int y = 0; y < 3; y++) {
            if (get_cell(game, board->origin_x + x, board->origin_y + y) == TRIANGLE)
                count++;
        }
        if (count >= 3) return true;
    }
    
    // Main diagonal
    int d1_count = 0;
    for (int i = 0; i < 3; i++) {
        if (get_cell(game, board->origin_x + i, board->origin_y + i) == TRIANGLE)
            d1_count++;
    }
    if (d1_count >= 3) return true;
    
    // Anti-diagonal
    int d2_count = 0;
    for (int i = 0; i < 3; i++) {
        if (get_cell(game, board->origin_x + i, board->origin_y + 2 - i) == TRIANGLE)
            d2_count++;
    }
    if (d2_count >= 3) return true;
    
    return false;
}

void create_new_board(GameState *game, int move_x, int move_y) {
    Board *prev_board = &game->boards[game->current_board_idx];
    
    // Determine who creates the board
    Player creator;
    if (prev_board->scores[PLAYER_X] < prev_board->scores[PLAYER_O]) {
        creator = PLAYER_X;
    } else if (prev_board->scores[PLAYER_O] < prev_board->scores[PLAYER_X]) {
        creator = PLAYER_O;
    } else {
        creator = game->current_player;
    }
    
    printf("\nPlayer %c creates the new board!\n", (creator == PLAYER_X) ? 'X' : 'O');
    
    // Infer board position from the move - convert to actual coordinates
    int board_x = (move_x / 3) * 3;
    int board_y = (move_y / 3) * 3;
    
    // Adjust to align properly for negative coordinates
    if (move_x < 0 && move_x % 3 != 0) board_x -= 3;
    if (move_y < 0 && move_y % 3 != 0) board_y -= 3;
    
    // Convert to grid coordinates
    int grid_x = board_x + GRID_OFFSET;
    int grid_y = board_y + GRID_OFFSET;
    
    if (!is_valid_board_position(game, grid_x, grid_y)) {
        printf("Invalid board position! Board must touch existing boards and not overlap.\n");
        return;
    }
    
    game->current_board_idx = game->num_boards;
    Board *new_board = &game->boards[game->num_boards++];
    new_board->origin_x = grid_x;
    new_board->origin_y = grid_y;
    new_board->active = true;
    
    printf("New board created at (%d, %d) to (%d, %d)\n", 
           board_x, board_y, board_x + 2, board_y + 2);
    
    // Place triangles
    place_triangles(game, new_board, creator);
    
    // Check for triple triangle
    if (check_triple_triangle(game, new_board)) {
        printf("\n*** TRIPLE TRIANGLE! ***\n");
        printf("Player %c doubles their score!\n", (creator == PLAYER_X) ? 'X' : 'O');
        game->total_scores[creator] *= 2;
        
        // Mark triangles as unplayable by converting them (we'll keep them as triangles but flag board)
        new_board->active = false;
        
        // Opposing player creates next board
        game->current_player = (creator == PLAYER_X) ? PLAYER_O : PLAYER_X;
        game->awaiting_board_placement = true;
        return;
    }
    
    // First player on new board is the creator
    game->current_player = creator;
    game->awaiting_board_placement = false;
}

bool validate_move(GameState *game, int x, int y, char *error_msg) {
    if (game->awaiting_board_placement) {
        // Any move is treated as a board placement request
        return true;
    }
    
    Board *board = &game->boards[game->current_board_idx];
    
    // Convert user coordinates to grid coordinates
    int grid_x = x + GRID_OFFSET;
    int grid_y = y + GRID_OFFSET;
    
    if (!is_in_board(board, grid_x, grid_y)) {
        int min_x = board->origin_x - GRID_OFFSET;
        int min_y = board->origin_y - GRID_OFFSET;
        sprintf(error_msg, "Position (%d,%d) is outside current board [%d,%d to %d,%d]",
                x, y, min_x, min_y, min_x + 2, min_y + 2);
        return false;
    }
    
    CellType cell = get_cell(game, grid_x, grid_y);
    if (cell != EMPTY && cell != TRIANGLE) {
        sprintf(error_msg, "Position (%d,%d) is already occupied", x, y);
        return false;
    }
    
    return true;
}

void make_move(GameState *game, int x, int y) {
    if (game->awaiting_board_placement) {
        create_new_board(game, x, y);
        return;
    }
    
    Board *board = &game->boards[game->current_board_idx];
    CellType mark = (game->current_player == PLAYER_X) ? X_MARK : O_MARK;
    
    // Convert user coordinates to grid coordinates
    int grid_x = x + GRID_OFFSET;
    int grid_y = y + GRID_OFFSET;
    
    set_cell(game, grid_x, grid_y, mark);
    
    game->move_history[game->num_moves].x = x;
    game->move_history[game->num_moves].y = y;
    game->move_history[game->num_moves].player = game->current_player;
    game->num_moves++;
    
    int points = score_position(game, board, grid_x, grid_y, game->current_player);
    board->scores[game->current_player] += points;
    game->total_scores[game->current_player] += points;
    
    if (points > 0) {
        printf("Player %c scores %d points!\n", 
               (game->current_player == PLAYER_X) ? 'X' : 'O', points);
    }
    
    if (is_board_full(game, board)) {
        printf("\n*** Board %d is full! ***\n", game->current_board_idx + 1);
        printf("Board scores: X=%d, O=%d\n", 
               board->scores[PLAYER_X], board->scores[PLAYER_O]);
        board->active = false;
        game->awaiting_board_placement = true;
        return;
    }
    
    game->current_player = (game->current_player == PLAYER_X) ? PLAYER_O : PLAYER_X;
}

void display_board(GameState *game) {
    Board *board = &game->boards[game->current_board_idx];
    
    printf("\n" COLOR_CYAN "=== Tic Tac Triangle ===" COLOR_RESET "\n");
    printf(COLOR_YELLOW "Total Score: X=%d  O=%d" COLOR_RESET "\n", 
           game->total_scores[PLAYER_X], game->total_scores[PLAYER_O]);
    printf("Current Board Score: X=%d  O=%d\n\n", 
           board->scores[PLAYER_X], board->scores[PLAYER_O]);
    
    // Find bounds of all boards
    int min_x = GRID_SIZE, min_y = GRID_SIZE;
    int max_x = -1, max_y = -1;
    
    for (int i = 0; i < game->num_boards; i++) {
        Board *b = &game->boards[i];
        int display_x = b->origin_x - GRID_OFFSET;
        int display_y = b->origin_y - GRID_OFFSET;
        
        if (display_x < min_x) min_x = display_x;
        if (display_y < min_y) min_y = display_y;
        if (display_x + 2 > max_x) max_x = display_x + 2;
        if (display_y + 2 > max_y) max_y = display_y + 2;
    }
    
    // Add some padding
    min_x -= 1;
    min_y -= 1;
    max_x += 1;
    max_y += 1;
    
    // Print column headers
    printf("     ");
    for (int x = min_x; x <= max_x; x++) {
        printf("%3d ", x);
    }
    printf("\n");
    
    // Print grid
    for (int y = min_y; y <= max_y; y++) {
        printf("%3d  ", y);
        
        for (int x = min_x; x <= max_x; x++) {
            int grid_x = x + GRID_OFFSET;
            int grid_y = y + GRID_OFFSET;
            
            // Check which board this belongs to
            Board *cell_board = NULL;
            int local_x = -1, local_y = -1;
            bool is_current = false;
            
            for (int i = 0; i < game->num_boards; i++) {
                if (is_in_board(&game->boards[i], grid_x, grid_y)) {
                    cell_board = &game->boards[i];
                    local_x = grid_x - cell_board->origin_x;
                    local_y = grid_y - cell_board->origin_y;
                    is_current = (i == game->current_board_idx);
                    break;
                }
            }
            
            CellType cell = get_cell(game, grid_x, grid_y);
            
            // Determine color based on scoring status
            const char *color = "";
            bool scored_x = cell_board && cell_board->scored_cells[local_y][local_x][PLAYER_X];
            bool scored_o = cell_board && cell_board->scored_cells[local_y][local_x][PLAYER_O];
            
            if (cell == EMPTY) {
                if (is_current) {
                    printf(COLOR_DIM "  · " COLOR_RESET);
                } else {
                    printf("    ");
                }
            } else if (cell == X_MARK) {
                if (scored_x) {
                    printf(COLOR_BRIGHT_RED "  X " COLOR_RESET);
                } else {
                    printf(COLOR_RED "  X " COLOR_RESET);
                }
            } else if (cell == O_MARK) {
                if (scored_o) {
                    printf(COLOR_BRIGHT_GREEN "  O " COLOR_RESET);
                } else {
                    printf(COLOR_GREEN "  O " COLOR_RESET);
                }
            } else if (cell == TRIANGLE) {
                if (scored_x && scored_o) {
                    printf(COLOR_DIM "  △ " COLOR_RESET);
                } else if (scored_x) {
                    printf(COLOR_BRIGHT_RED "  △ " COLOR_RESET);
                } else if (scored_o) {
                    printf(COLOR_BRIGHT_GREEN "  △ " COLOR_RESET);
                } else {
                    printf(COLOR_YELLOW "  △ " COLOR_RESET);
                }
            }
        }
        printf("\n");
    }
    
    // Draw board boundaries
    printf("\n" COLOR_CYAN "Active Boards:" COLOR_RESET "\n");
    for (int i = 0; i < game->num_boards; i++) {
        Board *b = &game->boards[i];
        int display_x = b->origin_x - GRID_OFFSET;
        int display_y = b->origin_y - GRID_OFFSET;
        
        const char *status = b->active ? COLOR_GREEN "ACTIVE" COLOR_RESET : COLOR_DIM "FULL" COLOR_RESET;
        const char *current = (i == game->current_board_idx) ? COLOR_YELLOW " ◄ CURRENT" COLOR_RESET : "";
        
        printf("  Board %d: (%d,%d) to (%d,%d) - %s%s\n", 
               i + 1, display_x, display_y, display_x + 2, display_y + 2, status, current);
    }
    
    printf("\n" COLOR_MAGENTA "Legend:" COLOR_RESET "\n");
    printf("  " COLOR_RED "X" COLOR_RESET " / " COLOR_GREEN "O" COLOR_RESET " = Unscored pieces\n");
    printf("  " COLOR_BRIGHT_RED "X" COLOR_RESET " / " COLOR_BRIGHT_GREEN "O" COLOR_RESET " = Scored pieces (cannot score again)\n");
    printf("  " COLOR_YELLOW "△" COLOR_RESET " = Available triangle (wildcard for both players)\n");
    printf("  " COLOR_BRIGHT_RED "△" COLOR_RESET " / " COLOR_BRIGHT_GREEN "△" COLOR_RESET " = Triangle scored once\n");
    printf("  " COLOR_DIM "△" COLOR_RESET " = Triangle scored by both (unavailable)\n");
    
    printf("\n" COLOR_CYAN "Recent moves:" COLOR_RESET "\n");
    int start = (game->num_moves > 5) ? game->num_moves - 5 : 0;
    for (int i = start; i < game->num_moves; i++) {
        const char *player_color = (game->move_history[i].player == PLAYER_X) ? COLOR_RED : COLOR_GREEN;
        printf("  %s%c" COLOR_RESET " at (%d,%d)\n", 
               player_color,
               (game->move_history[i].player == PLAYER_X) ? 'X' : 'O',
               game->move_history[i].x, game->move_history[i].y);
    }
    
    if (game->awaiting_board_placement) {
        printf("\n" COLOR_YELLOW "*** Awaiting new board placement ***" COLOR_RESET "\n");
        printf("Enter a move to place the new board (position will be inferred)\n");
        printf("Board must touch an existing board horizontally or vertically.\n");
    }
    
    const char *player_color = (game->current_player == PLAYER_X) ? COLOR_RED : COLOR_GREEN;
    printf("\n%sCurrent player: %c%s\n", player_color,
           (game->current_player == PLAYER_X) ? 'X' : 'O', COLOR_RESET);
}

int main() {
    GameState game;
    init_game(&game);
    
    printf("=== Tic Tac Triangle ===\n");
    printf("Starting board is at (0, 0) to (2, 2)\n\n");
    
    while (1) {
        display_board(&game);
        
        printf("\nEnter move (x y) or 'q' to quit: ");
        char input[100];
        if (!fgets(input, sizeof(input), stdin)) break;
        
        if (input[0] == 'q' || input[0] == 'Q') break;
        
        int x, y;
        if (sscanf(input, "%d %d", &x, &y) != 2) {
            printf("Invalid input. Please enter two numbers (x y).\n");
            continue;
        }
        
        char error_msg[256];
        if (!validate_move(&game, x, y, error_msg)) {
            printf("Invalid move: %s\n", error_msg);
            continue;
        }
        
        make_move(&game, x, y);
    }
    
    printf("\n=== Game Over ===\n");
    printf("Final Score: X=%d  O=%d\n", 
           game.total_scores[PLAYER_X], game.total_scores[PLAYER_O]);
    if (game.total_scores[PLAYER_X] > game.total_scores[PLAYER_O]) {
        printf("Player X wins!\n");
    } else if (game.total_scores[PLAYER_O] > game.total_scores[PLAYER_X]) {
        printf("Player O wins!\n");
    } else {
        printf("It's a tie!\n");
    }
    
    return 0;
}