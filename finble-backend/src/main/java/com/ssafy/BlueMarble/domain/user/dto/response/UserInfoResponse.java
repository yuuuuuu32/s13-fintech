package com.ssafy.BlueMarble.domain.user.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

// import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserInfoResponse {

    private String nickname;
    private String email;
    // private LocalDateTime createdAt;
    // private Integer level;
    // private Long xp;         // ex. 50
    // private Long maxXp;      // ex. 100
    // private Double progress; // ex. 0.5 (0.0 ~ 1.0)
    // private Integer totalGames;
    // private Integer totalWins;
    // private Integer totalLosses;
    // private Double winRate;
}
