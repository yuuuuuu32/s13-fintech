package com.ssafy.BlueMarble.domain.user.controller;

import com.ssafy.BlueMarble.domain.auth.dto.request.TokenRequest;
import com.ssafy.BlueMarble.domain.auth.security.UserDetailsImpl;
import com.ssafy.BlueMarble.domain.user.dto.request.UpdateUserInfoRequest;
import com.ssafy.BlueMarble.domain.user.dto.response.UserInfoResponse;
import com.ssafy.BlueMarble.domain.user.dto.response.UserSearchResponseDTO;
import com.ssafy.BlueMarble.domain.user.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/user")
@RequiredArgsConstructor
@Tag(name = "02.User", description = "사용자 관리 관련 API")
public class UserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "내 정보 조회", description = "현재 로그인한 사용자의 정보를 조회하는 API")
    public ResponseEntity<UserInfoResponse> getMyInfo(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        UserInfoResponse response = userService.getUserInfo(userDetails.getUser());
        return ResponseEntity.ok(response);
    }

    @PutMapping
    @Operation(summary = "내 정보 수정", description = "현재 로그인한 사용자의 정보를 수정하는 API")
    public ResponseEntity<String> updateMyInfo(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @Valid @RequestBody UpdateUserInfoRequest request) {

        userService.updateUserInfo(userDetails.getUser(), request);
        return ResponseEntity.ok("회원 정보 수정 성공");
    }

    @PostMapping("/logout")
    @Operation(summary = "로그아웃", description = "사용자의 Refresh Token을 삭제합니다.")
    public ResponseEntity<String> logOut(@RequestBody TokenRequest request) {
        userService.logOut(request.getRefreshToken());
        return ResponseEntity.ok("로그아웃이 성공적으로 처리되었습니다.");
    }

    @DeleteMapping
    @Operation(summary = "회원 탈퇴", description = "현재 로그인한 사용자의 계정을 삭제하는 API")
    public ResponseEntity<String> deleteMyAccount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        userService.deleteUser(userDetails.getUser());
        return ResponseEntity.ok("회원 탈퇴 성공");
    }

    @GetMapping("/search")
    @Operation(summary = "닉네임 검색", description = "닉네임으로 유저 조회하는 API")
    public ResponseEntity<UserSearchResponseDTO> searchUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String userName) {
        return ResponseEntity.ok(userService.searchUser(userName));
    }
}