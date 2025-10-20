package com.ssafy.BlueMarble.domain.user.dto.request;

import com.ssafy.BlueMarble.domain.user.entity.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserInfoRequest {

    @NotBlank(message = "닉네임은 필수입니다")
    @Size(min = 2, max = 15, message = "닉네임은 2-15자 사이여야 합니다")
    private String nickname;

    /**
     * User 엔티티에 닉네임 적용
     */
    public boolean applyTo(User user) {
        if (this.nickname != null && !this.nickname.isEmpty()) {
            user.setNickname(this.nickname);
            return true;
        }
        return false;
    }
}