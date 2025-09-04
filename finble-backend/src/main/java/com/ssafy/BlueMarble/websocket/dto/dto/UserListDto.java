package com.ssafy.BlueMarble.websocket.dto.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserListDto {
    String userId;
    String nickname;
    Boolean isOwner;
}
