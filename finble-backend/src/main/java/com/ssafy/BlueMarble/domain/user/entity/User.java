package com.ssafy.BlueMarble.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // JPA 기본 생성자
@AllArgsConstructor(access = AccessLevel.PRIVATE)  // 모든 필드 포함 생성자 (private)
@Builder(access = AccessLevel.PRIVATE)             // 빌더 (private)
public class User {

    public enum Provider {
        GOOGLE, KAKAO
    }

    public enum Role {
        USER, ADMIN
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(name="name", nullable = false)
    private String name;

    @Column(name = "nickname", nullable = false, unique = true)
    @Setter
    private String nickname;

    @Enumerated(EnumType.STRING)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Provider provider;

    @Column(name="icon")
    @Builder.Default
    @Setter
    private String iconUrl = null;

    public static User createOAuthUser(String loginEmail,String name, String nickname, Provider provider) {
        return User.builder()
                .email(loginEmail)
                .password("")
                .name(name)
                .nickname(nickname)
                .role(Role.USER)
                .provider(provider)
                .build();
    }
}